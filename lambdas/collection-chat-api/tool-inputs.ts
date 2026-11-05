import type {
  BanknoteSortField,
  CollectionGroupBy,
  SearchBanknotesFilters,
  SortDirection,
} from "./database"
import { extractSql, validateReadOnlyQuery } from "./sql-validation"

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function parseObject(input: unknown): Record<string, unknown> {
  if (!isRecord(input)) throw new Error("Tool input must be a JSON object.")
  return input
}

function optionalString(input: Record<string, unknown>, key: string, maxLength = 100): string | undefined {
  const value = input[key]
  if (value === undefined) return undefined
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new Error(`Tool argument "${key}" must be a non-empty string of at most ${maxLength} characters.`)
  }
  return value.trim()
}

function optionalNumber(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key]
  if (value === undefined) return undefined
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Tool argument "${key}" must be a finite number.`)
  }
  return value
}

function optionalInteger(input: Record<string, unknown>, key: string): number | undefined {
  const value = optionalNumber(input, key)
  if (value !== undefined && !Number.isInteger(value)) {
    throw new Error(`Tool argument "${key}" must be an integer.`)
  }
  return value
}

export function parseBanknoteSearchInput(input: unknown): SearchBanknotesFilters {
  const args = parseObject(input)
  const limit = optionalInteger(args, "limit")
  if (limit !== undefined && (limit < 1 || limit > 50)) {
    throw new Error('Tool argument "limit" must be between 1 and 50.')
  }
  const sortBy = args.sort_by
  const allowedSortFields: BanknoteSortField[] = [
    "year",
    "added_on",
    "denomination",
    "physical_area",
    "width",
    "height",
  ]
  if (
    sortBy !== undefined &&
    (typeof sortBy !== "string" || !allowedSortFields.includes(sortBy as BanknoteSortField))
  ) {
    throw new Error('Tool argument "sort_by" must be one of the supported fields.')
  }
  const sortDirection = args.sort_direction
  if (sortDirection !== undefined && sortDirection !== "asc" && sortDirection !== "desc") {
    throw new Error('Tool argument "sort_direction" must be "asc" or "desc".')
  }

  return {
    banknoteId: optionalInteger(args, "banknote_id"),
    country: optionalString(args, "country"),
    currency: optionalString(args, "currency"),
    yearFrom: optionalInteger(args, "year_from"),
    yearTo: optionalInteger(args, "year_to"),
    denomination: optionalNumber(args, "denomination"),
    material: optionalString(args, "material"),
    grade: optionalString(args, "grade"),
    sortBy: sortBy as BanknoteSortField | undefined,
    sortDirection: sortDirection as SortDirection | undefined,
    limit,
  }
}

export function parseBanknoteIdInput(input: unknown): number {
  const banknoteId = optionalInteger(parseObject(input), "banknote_id")
  if (banknoteId === undefined || banknoteId < 1) {
    throw new Error('Tool argument "banknote_id" must be a positive integer.')
  }
  return banknoteId
}

export function parseSummaryInput(input: unknown): {
  groupBy: CollectionGroupBy
  limit: number
  filters: { country?: string; currency?: string; yearFrom?: number; yearTo?: number }
} {
  const args = parseObject(input)
  const groupBy = args.group_by
  const allowedGroups: CollectionGroupBy[] = ["none", "country", "currency", "year", "material", "grade"]
  if (typeof groupBy !== "string" || !allowedGroups.includes(groupBy as CollectionGroupBy)) {
    throw new Error('Tool argument "group_by" must be one of the supported collection dimensions.')
  }
  const limit = optionalInteger(args, "limit") ?? 20
  if (limit < 1 || limit > 50) throw new Error('Tool argument "limit" must be between 1 and 50.')
  return {
    groupBy: groupBy as CollectionGroupBy,
    limit,
    filters: {
      country: optionalString(args, "country"),
      currency: optionalString(args, "currency"),
      yearFrom: optionalInteger(args, "year_from"),
      yearTo: optionalInteger(args, "year_to"),
    },
  }
}

export function parseSqlInput(input: unknown): string {
  const query = optionalString(parseObject(input), "query", 5000)
  if (!query) throw new Error('Tool argument "query" is required.')
  return validateReadOnlyQuery(extractSql(query))
}
