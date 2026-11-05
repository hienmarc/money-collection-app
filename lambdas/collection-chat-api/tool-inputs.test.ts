import assert from "node:assert/strict"
import test from "node:test"
import {
  parseBanknoteIdInput,
  parseBanknoteSearchInput,
  parseSqlInput,
  parseSummaryInput,
} from "./tool-inputs"

test("parses common collection search filters", () => {
  assert.deepEqual(
    parseBanknoteSearchInput({
      country: "Canada",
      year_from: 1950,
      year_to: 2000,
      grade: "UNC",
      sort_by: "year",
      sort_direction: "asc",
      limit: 10,
    }),
    {
      banknoteId: undefined,
      country: "Canada",
      currency: undefined,
      yearFrom: 1950,
      yearTo: 2000,
      denomination: undefined,
      material: undefined,
      grade: "UNC",
      sortBy: "year",
      sortDirection: "asc",
      limit: 10,
    },
  )
})

test("rejects invalid limits and non-integer years", () => {
  assert.throws(() => parseBanknoteSearchInput({ limit: 51 }), /limit/)
  assert.throws(() => parseBanknoteSearchInput({ year_from: 1950.5 }), /integer/)
})

test("requires a positive banknote ID", () => {
  assert.equal(parseBanknoteIdInput({ banknote_id: 42 }), 42)
  assert.throws(() => parseBanknoteIdInput({ banknote_id: 0 }), /positive integer/)
})

test("supports sorting by area, width, or height in either direction", () => {
  assert.equal(
    parseBanknoteSearchInput({ sort_by: "physical_area", sort_direction: "asc", limit: 1 }).sortBy,
    "physical_area",
  )
  assert.equal(
    parseBanknoteSearchInput({ sort_by: "width", sort_direction: "desc", limit: 1 }).sortBy,
    "width",
  )
  assert.equal(parseBanknoteSearchInput({ sort_by: "height" }).sortBy, "height")
  assert.throws(() => parseBanknoteSearchInput({ sort_by: "weight" }), /supported fields/)
  assert.throws(() => parseBanknoteSearchInput({ sort_direction: "up" }), /sort_direction/)
})

test("restricts collection summaries to supported dimensions", () => {
  assert.deepEqual(parseSummaryInput({ group_by: "country", limit: 5, country: "Canada" }), {
    groupBy: "country",
    limit: 5,
    filters: { country: "Canada", currency: undefined, yearFrom: undefined, yearTo: undefined },
  })
  assert.throws(() => parseSummaryInput({ group_by: "ownerid" }), /supported collection dimensions/)
})

test("validates exploratory SQL as a single read-only query", () => {
  assert.equal(
    parseSqlInput({
      query: "SELECT b.banknoteid, c.name FROM public.banknotes b LEFT JOIN public.currencies c ON c.currencyid = b.currencyid",
    }),
    "SELECT b.banknoteid, c.name FROM public.banknotes b LEFT JOIN public.currencies c ON c.currencyid = b.currencyid",
  )
  assert.throws(() => parseSqlInput({ query: "DELETE FROM public.banknotes" }))
  assert.throws(() => parseSqlInput({ query: "SELECT 1; DELETE FROM public.banknotes" }))
})
