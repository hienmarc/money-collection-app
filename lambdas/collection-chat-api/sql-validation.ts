import { parse } from "pgsql-ast-parser"

const forbiddenStatementTypes = new Set([
  "alter",
  "comment",
  "commit",
  "copy",
  "create",
  "delete",
  "do",
  "drop",
  "execute",
  "grant",
  "insert",
  "prepare",
  "refresh",
  "revoke",
  "rollback",
  "set",
  "truncate",
  "update",
])

const forbiddenFunctions = new Set([
  "dblink",
  "generate_series",
  "lo_export",
  "lo_import",
  "nextval",
  "pg_advisory_lock",
  "pg_advisory_lock_shared",
  "pg_advisory_xact_lock",
  "pg_advisory_xact_lock_shared",
  "pg_notify",
  "pg_read_binary_file",
  "pg_read_file",
  "pg_sleep",
  "pg_sleep_for",
  "pg_sleep_until",
  "set_config",
  "setval",
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

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child)
      return
    }
    if (!node || typeof node !== "object") return

    const record = node as Record<string, unknown>
    const type = record.type
    if (typeof type === "string" && forbiddenStatementTypes.has(type.toLowerCase())) {
      throw new UnsafeQueryError("Only read-only SELECT queries are allowed.")
    }

    if (type === "call") {
      const fn = record.function as { name?: unknown; schema?: unknown } | undefined
      if (
        !fn ||
        typeof fn.name !== "string" ||
        forbiddenFunctions.has(fn.name.toLowerCase()) ||
        fn.name.toLowerCase().startsWith("pg_advisory_")
      ) {
        throw new UnsafeQueryError("The generated search contains a disallowed function.")
      }
    }

    if (type === "select" && (record.for !== undefined || record.skip !== undefined || record.into !== undefined)) {
      throw new UnsafeQueryError("Locking and table-creation clauses are not allowed.")
    }

    for (const value of Object.values(record)) visit(value)
  }

  const firstStatement = statements[0] as unknown
  if (
    !firstStatement ||
    typeof firstStatement !== "object" ||
    !("type" in firstStatement) ||
    !["select", "with", "union", "union all"].includes(String(firstStatement.type).toLowerCase())
  ) {
    throw new UnsafeQueryError("Only a read-only SELECT query is allowed.")
  }
  visit(firstStatement)

  const normalized = sql.trim().replace(/;+$/, "").trim()
  if (!normalized) throw new UnsafeQueryError("The generated search is empty.")
  return normalized
}
