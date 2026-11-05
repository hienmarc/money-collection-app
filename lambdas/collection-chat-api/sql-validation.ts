import { parse, toSql } from "pgsql-ast-parser"

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

export interface OwnerScopedRelation {
  schema: string
  table: string
  searchPathOrder?: number | null
}

export interface ScopedQuery {
  sql: string
  parameters: unknown[]
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`
}

function getCteNames(bindings: unknown): Set<string> {
  if (!Array.isArray(bindings)) return new Set()
  return new Set(
    bindings.flatMap((binding) => {
      if (!binding || typeof binding !== "object") return []
      const alias = (binding as Record<string, unknown>).alias
      if (!alias || typeof alias !== "object") return []
      const name = (alias as Record<string, unknown>).name
      return typeof name === "string" ? [name] : []
    }),
  )
}

export function scopeBanknotesToOwner(
  sql: string,
  userId: string,
  parameters: unknown[],
  ownerScopedRelations: OwnerScopedRelation[],
): ScopedQuery {
  if (ownerScopedRelations.length === 0) return { sql, parameters }

  let statements: ReturnType<typeof parse>
  try {
    statements = parse(sql)
  } catch {
    throw new UnsafeQueryError("The generated SQL could not be parsed for banknote owner scoping.")
  }
  if (statements.length !== 1) {
    throw new UnsafeQueryError("Only one read-only search is allowed.")
  }

  const maxParameterIndex = { value: 0 }
  const findParameters = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) findParameters(child)
      return
    }
    if (!node || typeof node !== "object") return
    const record = node as Record<string, unknown>
    if (record.type === "parameter" && typeof record.name === "string") {
      const match = /^\$(\d+)$/.exec(record.name)
      if (match) maxParameterIndex.value = Math.max(maxParameterIndex.value, Number(match[1]))
    }
    for (const value of Object.values(record)) findParameters(value)
  }
  findParameters(statements[0])

  const relationKeys = new Set(ownerScopedRelations.map(({ schema, table }) => `${schema}.${table}`))
  const defaultSchemas = new Map<string, string>()
  for (const { schema, table, searchPathOrder } of ownerScopedRelations) {
    if (searchPathOrder !== null && !defaultSchemas.has(table)) defaultSchemas.set(table, schema)
  }
  const parameterIndex = maxParameterIndex.value + 1
  let scopedRelationCount = 0

  const transform = (node: unknown, cteNames = new Set<string>()): void => {
    if (Array.isArray(node)) {
      for (const child of node) transform(child, cteNames)
      return
    }
    if (!node || typeof node !== "object") return

    const record = node as Record<string, unknown>
    if (record.type === "with" || record.type === "with recursive") {
      const bindings = Array.isArray(record.bind) ? record.bind : []
      const recursiveCteNames = new Set([...cteNames, ...getCteNames(bindings)])
      const localCteNames = new Set(cteNames)
      for (const binding of bindings) {
        if (binding && typeof binding === "object") {
          const bindingRecord = binding as Record<string, unknown>
          const bindingName = getCteNames([bindingRecord])
          transform(
            bindingRecord.statement,
            record.type === "with recursive"
              ? recursiveCteNames
              : new Set([...localCteNames, ...bindingName]),
          )
          for (const name of bindingName) localCteNames.add(name)
        }
      }
      transform(record.in, localCteNames)
      for (const [key, value] of Object.entries(record)) {
        if (key !== "bind" && key !== "in") transform(value, cteNames)
      }
      return
    }

    for (const value of Object.values(record)) transform(value, cteNames)

    if (record.type !== "select" || !Array.isArray(record.from)) return
    for (const source of record.from) {
      if (!source || typeof source !== "object") continue
      const sourceRecord = source as Record<string, unknown>
      if (sourceRecord.type !== "table") continue
      const name = sourceRecord.name
      if (!name || typeof name !== "object") continue
      const relation = name as Record<string, unknown>
      if (typeof relation.name !== "string") continue
      if (relation.schema === undefined && cteNames.has(relation.name)) continue
      const schema = typeof relation.schema === "string"
        ? relation.schema
        : defaultSchemas.get(relation.name)
      if (!schema) continue
      const relationKey = `${schema}.${relation.name}`
      if (!relationKeys.has(relationKey)) continue

      const alias = typeof relation.alias === "string" ? relation.alias : relation.name
      const scopedSql =
        `SELECT * FROM ${quoteIdentifier(schema)}.${quoteIdentifier(relation.name)} AS ${quoteIdentifier(alias)} ` +
        `WHERE ${quoteIdentifier(alias)}."ownerid" = $${parameterIndex}`
      const scopedStatement = parse(scopedSql)[0]
      delete sourceRecord.name
      sourceRecord.type = "statement"
      sourceRecord.statement = scopedStatement
      sourceRecord.alias = alias
      scopedRelationCount += 1
    }
  }

  transform(statements[0])
  if (scopedRelationCount === 0) return { sql, parameters }
  if (maxParameterIndex.value > parameters.length) {
    throw new UnsafeQueryError("The generated SQL contains parameters without supplied values.")
  }
  return {
    sql: toSql.statement(statements[0]),
    parameters: [...parameters, userId],
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
