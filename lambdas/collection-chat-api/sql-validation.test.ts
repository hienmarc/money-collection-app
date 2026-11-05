import assert from "node:assert/strict"
import test from "node:test"
import { extractSql, UnsafeQueryError, validateReadOnlyQuery } from "./sql-validation"

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
