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

test("allows a scoped banknote count query", () => {
  assert.equal(
    validateReadOnlyQuery(
      "SELECT COUNT(*) AS quantity FROM public.chatbot_my_banknotes WHERE lower(currency_name) = 'canadian dollar';",
    ),
    "SELECT COUNT(*) AS quantity FROM public.chatbot_my_banknotes WHERE lower(currency_name) = 'canadian dollar'",
  )
})

test("allows aggregation, grouping, and a subquery over the scoped view", () => {
  assert.equal(
    validateReadOnlyQuery(
      "SELECT currency_name, COUNT(*) AS quantity FROM (SELECT currency_name FROM chatbot_my_banknotes) AS notes GROUP BY currency_name ORDER BY quantity DESC",
    ),
    "SELECT currency_name, COUNT(*) AS quantity FROM (SELECT currency_name FROM chatbot_my_banknotes) AS notes GROUP BY currency_name ORDER BY quantity DESC",
  )
})

test("allows filtering a country in the collection view", () => {
  assert.equal(
    validateReadOnlyQuery(
      "SELECT COUNT(*) FROM public.chatbot_my_banknotes WHERE country_names @> ARRAY['Canada']",
    ),
    "SELECT COUNT(*) FROM public.chatbot_my_banknotes WHERE country_names @> ARRAY['Canada']",
  )
})

test("allows counting banknotes by country using the scoped country array", () => {
  assert.equal(
    validateReadOnlyQuery(
      "SELECT country_name, COUNT(*) AS quantity FROM public.chatbot_my_banknotes CROSS JOIN LATERAL unnest(country_names) AS country(country_name) GROUP BY country_name ORDER BY quantity DESC LIMIT 1",
    ),
    "SELECT country_name, COUNT(*) AS quantity FROM public.chatbot_my_banknotes CROSS JOIN LATERAL unnest(country_names) AS country(country_name) GROUP BY country_name ORDER BY quantity DESC LIMIT 1",
  )
})

for (const query of [
  "SELECT COUNT(*) FROM chatbot_my_banknotes; DELETE FROM banknotes",
  "DELETE FROM chatbot_my_banknotes",
  "SELECT * FROM auth.users",
  "SELECT * FROM banknotes",
  "WITH notes AS (SELECT * FROM chatbot_my_banknotes) SELECT * FROM notes",
  "SELECT set_config('request.jwt.claim.sub', 'another-user', true) FROM chatbot_my_banknotes",
  "SELECT pg_sleep(30) FROM chatbot_my_banknotes",
  "SELECT COUNT(*) FROM chatbot_my_banknotes FOR UPDATE",
  "SELECT 'banknotes'::regclass FROM chatbot_my_banknotes",
  "SELECT generate_series(1, 1000000000) FROM chatbot_my_banknotes",
  "SELECT 1",
]) {
  test(`rejects unsafe SQL: ${query}`, () => {
    assert.throws(() => validateReadOnlyQuery(query), UnsafeQueryError)
  })
}
