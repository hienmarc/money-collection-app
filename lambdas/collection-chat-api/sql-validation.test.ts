import assert from "node:assert/strict"
import test from "node:test"
import { extractSql, scopeBanknotesToOwner, UnsafeQueryError, validateReadOnlyQuery } from "./sql-validation"

test("extracts SQL from common Bedrock response wrappers", () => {
  assert.equal(extractSql("```sql\nSELECT COUNT(*) FROM chatbot_my_banknotes;\n```"), "SELECT COUNT(*) FROM chatbot_my_banknotes;")
  assert.equal(extractSql("SQL: SELECT COUNT(*) FROM chatbot_my_banknotes;"), "SELECT COUNT(*) FROM chatbot_my_banknotes;")
  assert.equal(extractSql('{"sql":"SELECT COUNT(*) FROM chatbot_my_banknotes;"}'), "SELECT COUNT(*) FROM chatbot_my_banknotes;")
  assert.equal(extractSql("SELECT COUNT(*) FROM chatbot_my_banknotes;"), "SELECT COUNT(*) FROM chatbot_my_banknotes;")
})

test("validates SQL returned in a fenced Bedrock response", () => {
  assert.equal(
    validateReadOnlyQuery(extractSql("```sql\nSELECT COUNT(*) FROM public.chatbot_my_banknotes;\n```")),
    "SELECT COUNT(*) FROM public.chatbot_my_banknotes",
  )
})

test("allows a read from a table other than the chatbot view", () => {
  assert.equal(
    validateReadOnlyQuery(
      "SELECT COUNT(*) AS quantity FROM public.banknotes WHERE year > 2000;",
    ),
    "SELECT COUNT(*) AS quantity FROM public.banknotes WHERE year > 2000",
  )
})

test("allows joins, CTEs, subqueries, and aggregation across tables", () => {
  assert.equal(
    validateReadOnlyQuery(
      "WITH notes AS (SELECT b.banknoteid, c.name FROM public.banknotes b LEFT JOIN public.currencies c ON c.currencyid = b.currencyid) SELECT name, COUNT(*) AS quantity FROM notes GROUP BY name ORDER BY quantity DESC",
    ),
    "WITH notes AS (SELECT b.banknoteid, c.name FROM public.banknotes b LEFT JOIN public.currencies c ON c.currencyid = b.currencyid) SELECT name, COUNT(*) AS quantity FROM notes GROUP BY name ORDER BY quantity DESC",
  )
})

test("allows reads from another schema and union queries", () => {
  assert.equal(
    validateReadOnlyQuery(
      "SELECT id FROM auth.users UNION SELECT ownerid AS id FROM public.banknotes",
    ),
    "SELECT id FROM auth.users UNION SELECT ownerid AS id FROM public.banknotes",
  )
})

test("allows a read-only query without a table", () => {
  assert.equal(
    validateReadOnlyQuery("SELECT 1"),
    "SELECT 1",
  )
})

test("allows common PostgreSQL functions, window expressions, and casts", () => {
  const query =
    "SELECT jsonb_agg(jsonb_build_object('id', banknoteid, 'rank', row_number() OVER (ORDER BY year))) FROM public.banknotes WHERE banknoteid::uuid IS NOT NULL"
  assert.equal(validateReadOnlyQuery(query), query)
})

test("allows PostgreSQL JSON and regex operators", () => {
  const query = "SELECT metadata #>> '{country,name}' FROM public.banknotes WHERE code ~* '^A'"
  assert.equal(validateReadOnlyQuery(query), query)
})

test("scopes banknotes in joins to the current user and leaves other relations untouched", () => {
  const result = scopeBanknotesToOwner(
    "SELECT b.banknoteid FROM public.banknotes b LEFT JOIN public.user_notes n ON n.banknoteid = b.banknoteid WHERE b.year > $1 AND b.ownerid = 'another-user'",
    "current-user",
    [2000],
    [{ schema: "public", table: "banknotes" }],
  )

  assert.match(result.sql, /FROM \(SELECT \*.*public\.banknotes.*AS b.*b \.ownerid = \(\$2\)/)
  assert.match(result.sql, /LEFT JOIN public\.user_notes\s+AS n/)
  assert.doesNotMatch(result.sql, /n \.ownerid|n \.userid/)
  assert.doesNotThrow(() => validateReadOnlyQuery(result.sql))
  assert.deepEqual(result.parameters, [2000, "current-user"])
})

test("scopes banknotes inside CTEs and subqueries without treating CTE names as relations", () => {
  const result = scopeBanknotesToOwner(
    "WITH banknotes AS (SELECT * FROM public.user_notes) SELECT * FROM banknotes WHERE EXISTS (SELECT 1 FROM public.banknotes b)",
    "current-user",
    [],
    [{ schema: "public", table: "banknotes" }],
  )

  assert.equal((result.sql.match(/ownerid\s*=\s*\(\$1\)/g) ?? []).length, 1)
  assert.match(result.sql, /FROM banknotes/)
  assert.deepEqual(result.parameters, ["current-user"])
})

test("does not rewrite SQL when banknotes is not queried", () => {
  const sql = "SELECT COUNT(*) FROM public.countries"
  assert.deepEqual(scopeBanknotesToOwner(sql, "current-user", [], [{ schema: "public", table: "banknotes" }]), {
    sql,
    parameters: [],
  })
})

test("scopes qualified banknotes outside the search path and resolves unqualified banknotes in search-path order", () => {
  const result = scopeBanknotesToOwner(
    "SELECT * FROM private.banknotes p JOIN banknotes u ON u.id = p.id",
    "current-user",
    [],
    [
      { schema: "private", table: "banknotes", searchPathOrder: null },
      { schema: "public", table: "banknotes", searchPathOrder: 1 },
    ],
  )

  assert.equal((result.sql.match(/ownerid\s*=\s*\(\$1\)/g) ?? []).length, 2)
  assert.match(result.sql, /private\.banknotes/)
  assert.match(result.sql, /public\.banknotes/)
})

for (const query of [
  "SELECT COUNT(*) FROM public.banknotes; DELETE FROM public.banknotes",
  "DELETE FROM public.banknotes",
  "WITH removed AS (DELETE FROM public.banknotes RETURNING *) SELECT * FROM removed",
  "SELECT set_config('request.jwt.claim.sub', 'another-user', true) FROM chatbot_my_banknotes",
  "SELECT pg_catalog.set_config('request.jwt.claim.sub', 'another-user', true)",
  "SELECT pg_sleep(30) FROM chatbot_my_banknotes",
  "SELECT pg_catalog.pg_advisory_unlock(1)",
  "SELECT pg_read_file('/etc/passwd')",
  "SELECT COUNT(*) FROM public.banknotes FOR UPDATE",
  "SELECT generate_series(1, 1000000000) FROM public.banknotes",
]) {
  test(`rejects unsafe SQL: ${query}`, () => {
    assert.throws(() => validateReadOnlyQuery(query), UnsafeQueryError)
  })
}
