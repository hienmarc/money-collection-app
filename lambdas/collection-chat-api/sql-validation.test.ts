import assert from "node:assert/strict"
import test from "node:test"
import { UnsafeQueryError, validateReadOnlyQuery } from "./sql-validation"

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
  "SELECT 1",
]) {
  test(`rejects unsafe SQL: ${query}`, () => {
    assert.throws(() => validateReadOnlyQuery(query), UnsafeQueryError)
  })
}
