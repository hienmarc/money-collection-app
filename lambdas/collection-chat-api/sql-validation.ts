import { parse } from "pgsql-ast-parser"

const safeFunctions = new Set([
  "abs",
  "array_agg",
  "avg",
  "bool_and",
  "bool_or",
  "btrim",
  "ceil",
  "ceiling",
  "coalesce",
  "concat",
  "count",
  "date_part",
  "date_trunc",
  "floor",
  "greatest",
  "least",
  "length",
  "lower",
  "max",
  "min",
  "nullif",
  "round",
  "string_agg",
  "sum",
  "to_char",
  "trim",
  "upper",
])

const safeOperators = new Set([
  "AND",
  "OR",
  "IN",
  "NOT IN",
  "LIKE",
  "NOT LIKE",
  "ILIKE",
  "NOT ILIKE",
  "=",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "@>",
  "<@",
  "&&",
  "||",
  "+",
  "-",
  "*",
  "/",
  "%",
  "AT TIME ZONE",
])

const safeUnaryOperators = new Set([
  "NOT",
  "+",
  "-",
  "IS NULL",
  "IS NOT NULL",
  "IS TRUE",
  "IS FALSE",
  "IS NOT TRUE",
  "IS NOT FALSE",
])

const safeNodeTypes = new Set([
  "array",
  "array_index",
  "binary",
  "bool",
  "call",
  "case",
  "cast",
  "constant",
  "default",
  "extract",
  "integer",
  "list",
  "member",
  "null",
  "numeric",
  "overlay",
  "ref",
  "select",
  "statement",
  "string",
  "substring",
  "table",
  "ternary",
  "unary",
  "union",
  "union all",
  "value",
  "INNER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL JOIN",
  "CROSS JOIN",
])

const safeCastTypes = new Set([
  "bigint",
  "boolean",
  "date",
  "double precision",
  "integer",
  "numeric",
  "real",
  "text",
  "timestamp",
  "timestamp with time zone",
  "timestamp without time zone",
  "varchar",
])

export class UnsafeQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "UnsafeQueryError"
  }
}

export function extractSql(text: string): string {
  let sql = text.trim().replace(/^\uFEFF/, "")
  const fenced = sql.match(/^```(?:sql|postgres|postgresql)?\s*([\s\S]*?)\s*```$/i)
  if (fenced) sql = fenced[1].trim()

  const labeled = sql.match(/^sql\s*:\s*([\s\S]+)$/i)
  if (labeled) sql = labeled[1].trim()

  if (sql.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(sql)
      if (
        parsed &&
        typeof parsed === "object" &&
        "sql" in parsed &&
        typeof parsed.sql === "string"
      ) {
        sql = parsed.sql.trim()
      }
    } catch {
      throw new UnsafeQueryError("The generated SQL response contains malformed JSON.")
    }
  }

  return sql
}

export function validateReadOnlyQuery(sql: string): string {
  let statements: ReturnType<typeof parse>
  try {
    statements = parse(sql)
  } catch {
    throw new UnsafeQueryError("The generated SQL could not be parsed.")
  }

  if (statements.length !== 1) {
    throw new UnsafeQueryError("Only one read-only search is allowed.")
  }

  let readsCollection = false
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child)
      return
    }
    if (!node || typeof node !== "object") return

    const record = node as Record<string, unknown>
    const type = record.type
    if (typeof type === "string" && !safeNodeTypes.has(type)) {
      throw new UnsafeQueryError("The generated search contains an unsupported SQL operation.")
    }

    if (type === "table") {
      const name = record.name as { name?: unknown; schema?: unknown } | undefined
      if (
        !name ||
        name.name !== "chatbot_my_banknotes" ||
        (name.schema !== undefined && name.schema !== "public")
      ) {
        throw new UnsafeQueryError("The search may only read your banknote collection.")
      }
      readsCollection = true
    }

    if (type === "call") {
      const fn = record.function as { name?: unknown; schema?: unknown } | undefined
      if (
        !fn ||
        typeof fn.name !== "string" ||
        !safeFunctions.has(fn.name.toLowerCase()) ||
        (fn.schema !== undefined && fn.schema !== "pg_catalog")
      ) {
        throw new UnsafeQueryError("The generated search contains an unsupported SQL function.")
      }
    }

    if (type === "binary") {
      if (
        typeof record.op !== "string" ||
        !safeOperators.has(record.op) ||
        (record.opSchema !== undefined && record.opSchema !== "pg_catalog")
      ) {
        throw new UnsafeQueryError("The generated search contains an unsupported SQL operator.")
      }
    }

    if (type === "unary" && (typeof record.op !== "string" || !safeUnaryOperators.has(record.op))) {
      throw new UnsafeQueryError("The generated search contains an unsupported SQL operator.")
    }

    if (
      type === "ternary" &&
      record.op !== "BETWEEN" &&
      record.op !== "NOT BETWEEN"
    ) {
      throw new UnsafeQueryError("The generated search contains an unsupported SQL operator.")
    }

    if (type === "cast") {
      const target = record.to as { name?: unknown } | undefined
      if (!target || typeof target.name !== "string" || !safeCastTypes.has(target.name.toLowerCase())) {
        throw new UnsafeQueryError("The generated search contains an unsupported SQL cast.")
      }
    }

    if (type === "select" && (record.for !== undefined || record.skip !== undefined || record.into !== undefined)) {
      throw new UnsafeQueryError("Locking and table-creation clauses are not allowed.")
    }

    for (const value of Object.values(record)) visit(value)
  }

  visit(statements[0])
  if (!readsCollection) throw new UnsafeQueryError("The search must read your banknote collection.")

  const normalized = sql.trim().replace(/;+$/, "").trim()
  if (!normalized) throw new UnsafeQueryError("The generated search is empty.")
  return normalized
}
