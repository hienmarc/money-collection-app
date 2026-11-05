import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager"
import { Client } from "pg"

const secrets = new SecretsManagerClient({})
const dbHost = requiredEnvironment("SUPABASE_DB_HOST")
const dbUser = requiredEnvironment("SUPABASE_DB_USER")
const dbSecretArn = requiredEnvironment("SUPABASE_DB_SECRET_ARN")
const statementTimeoutMs = 5000

export interface BanknoteQueryResult extends Record<string, unknown> {
  front_image?: string | null
  back_image?: string | null
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

async function getDatabasePassword(): Promise<string> {
  const result = await secrets.send(new GetSecretValueCommand({ SecretId: dbSecretArn }))
  if (!result.SecretString) throw new Error("The database secret is empty.")
  return result.SecretString
}

async function connectToDatabase(): Promise<Client> {
  const client = new Client({
    host: dbHost,
    port: 6543,
    database: "postgres",
    user: dbUser,
    password: await getDatabasePassword(),
    // Supabase's shared pooler requires TLS, but its chain is not trusted by the Lambda runtime.
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    statement_timeout: statementTimeoutMs,
    application_name: "money-collection-chat",
  })
  await client.connect()
  return client
}

async function withAuthenticatedReadOnly<T>(
  userId: string,
  operation: (client: Client) => Promise<T>,
): Promise<T> {
  const client = await connectToDatabase()
  try {
    await client.query("BEGIN READ ONLY")
    await client.query("SET LOCAL ROLE authenticated")
    await client.query("SET LOCAL statement_timeout = '5000ms'")
    await client.query(
      "SELECT set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true), set_config('request.jwt.claim.role', 'authenticated', true)",
      [JSON.stringify({ sub: userId, role: "authenticated" }), userId],
    )
    return await operation(client)
  } finally {
    try {
      await client.query("ROLLBACK")
    } finally {
      await client.end()
    }
  }
}

export async function getReadableSchema(userId: string): Promise<string> {
  return withAuthenticatedReadOnly(userId, async (client) => {
    const result = await client.query<{
      table_schema: string
      table_name: string
      column_name: string
      data_type: string
    }>(
      `SELECT c.table_schema, c.table_name, c.column_name, c.data_type
       FROM information_schema.columns AS c
       JOIN information_schema.tables AS t
         ON t.table_schema = c.table_schema AND t.table_name = c.table_name
       WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
         AND t.table_type IN ('BASE TABLE', 'VIEW', 'FOREIGN')
       ORDER BY c.table_schema, c.table_name, c.ordinal_position`,
    )
    const relations = new Map<string, string[]>()
    for (const row of result.rows) {
      const relation = `"${row.table_schema.replace(/"/g, '""')}"."${row.table_name.replace(/"/g, '""')}"`
      const columns = relations.get(relation) ?? []
      columns.push(`"${row.column_name.replace(/"/g, '""')}" ${row.data_type}`)
      relations.set(relation, columns)
    }
    return [...relations].map(([relation, columns]) => `${relation}: ${columns.join(", ")}`).join("\n")
  })
}

export async function runReadOnlyQuery(
  userId: string,
  sql: string,
  parameters: unknown[] = [],
  limit = 100,
): Promise<BanknoteQueryResult[]> {
  return withAuthenticatedReadOnly(userId, async (client) => {
    const result = await client.query(
      `SELECT * FROM (${sql}) AS chatbot_result LIMIT ${limit}`,
      parameters,
    )
    return result.rows as BanknoteQueryResult[]
  })
}

export interface SearchBanknotesFilters {
  banknoteId?: number
  country?: string
  currency?: string
  yearFrom?: number
  yearTo?: number
  denomination?: number
  material?: string
  grade?: string
  sortBy?: BanknoteSortField
  sortDirection?: SortDirection
  limit?: number
}

export type BanknoteSortField = "year" | "added_on" | "denomination" | "physical_area" | "width" | "height"
export type SortDirection = "asc" | "desc"

export async function searchBanknotes(
  userId: string,
  filters: SearchBanknotesFilters,
): Promise<BanknoteQueryResult[]> {
  const values: unknown[] = []
  const conditions: string[] = []
  const addCondition = (condition: (placeholder: string) => string, value: unknown) => {
    values.push(value)
    conditions.push(condition(`$${values.length}`))
  }

  if (filters.banknoteId !== undefined) {
    addCondition((placeholder) => `b.banknoteid = ${placeholder}`, filters.banknoteId)
  }
  if (filters.currency) {
    addCondition((placeholder) => `c.name ILIKE ${placeholder}`, `%${filters.currency}%`)
  }
  if (filters.country) {
    addCondition(
      (placeholder) => `EXISTS (
        SELECT 1
        FROM public.currencycountry AS cc
        JOIN public.countries AS co ON co.countryid = cc.countryid
        WHERE cc.currencyid = b.currencyid AND co.name ILIKE ${placeholder}
      )`,
      `%${filters.country}%`,
    )
  }
  if (filters.yearFrom !== undefined) {
    addCondition((placeholder) => `b.year >= ${placeholder}`, filters.yearFrom)
  }
  if (filters.yearTo !== undefined) {
    addCondition((placeholder) => `b.year <= ${placeholder}`, filters.yearTo)
  }
  if (filters.denomination !== undefined) {
    addCondition((placeholder) => `b.denomination = ${placeholder}`, filters.denomination)
  }
  if (filters.material) {
    addCondition((placeholder) => `b.material ILIKE ${placeholder}`, `%${filters.material}%`)
  }
  if (filters.grade) {
    addCondition((placeholder) => `b.grade::text ILIKE ${placeholder}`, filters.grade)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
  const limit = Math.max(1, Math.min(filters.limit ?? 20, 50))
  const sortExpressions: Record<BanknoteSortField, string> = {
    year: "b.year",
    added_on: "b.added_on",
    denomination: "b.denomination",
    physical_area: "(b.width * b.height)",
    width: "b.width",
    height: "b.height",
  }
  const sortBy = filters.sortBy ?? "added_on"
  const sortDirection = filters.sortDirection ?? "desc"
  const nullOrdering = sortBy === "year" || sortBy === "physical_area" ? " NULLS LAST" : ""
  const sql = `
    SELECT
      b.banknoteid, b.code, b.denomination, b.year, b.material, b.grade::text AS grade,
      b.width, b.height, b.description, b.added_on, b.front_image, b.back_image,
      c.name AS currency_name, c.code AS currency_code, c.symbol AS currency_symbol,
      ARRAY(
        SELECT DISTINCT co.name
        FROM public.currencycountry AS cc
        JOIN public.countries AS co ON co.countryid = cc.countryid
        WHERE cc.currencyid = b.currencyid
        ORDER BY co.name
      ) AS country_names
    FROM public.banknotes AS b
    LEFT JOIN public.currencies AS c ON c.currencyid = b.currencyid
    ${whereClause}
    ORDER BY ${sortExpressions[sortBy]} ${sortDirection.toUpperCase()}${nullOrdering}, b.banknoteid DESC
    LIMIT ${limit}
  `
  return runReadOnlyQuery(userId, sql, values, limit)
}

export type CollectionGroupBy = "none" | "country" | "currency" | "year" | "material" | "grade"

export interface CollectionSummaryFilters {
  country?: string
  currency?: string
  yearFrom?: number
  yearTo?: number
}

function buildSummaryFilters(filters: CollectionSummaryFilters): { clause: string; values: unknown[] } {
  const conditions: string[] = []
  const values: unknown[] = []
  const addCondition = (condition: (placeholder: string) => string, value: unknown) => {
    values.push(value)
    conditions.push(condition(`$${values.length}`))
  }

  if (filters.currency) {
    addCondition((placeholder) => `currency.name ILIKE ${placeholder}`, `%${filters.currency}%`)
  }
  if (filters.country) {
    addCondition(
      (placeholder) => `EXISTS (
        SELECT 1
        FROM public.currencycountry AS filter_cc
        JOIN public.countries AS filter_co ON filter_co.countryid = filter_cc.countryid
        WHERE filter_cc.currencyid = b.currencyid AND filter_co.name ILIKE ${placeholder}
      )`,
      `%${filters.country}%`,
    )
  }
  if (filters.yearFrom !== undefined) {
    addCondition((placeholder) => `b.year >= ${placeholder}`, filters.yearFrom)
  }
  if (filters.yearTo !== undefined) {
    addCondition((placeholder) => `b.year <= ${placeholder}`, filters.yearTo)
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  }
}

export async function summarizeCollection(
  userId: string,
  groupBy: CollectionGroupBy,
  limit = 20,
  filters: CollectionSummaryFilters = {},
): Promise<BanknoteQueryResult[]> {
  const safeLimit = Math.max(1, Math.min(limit, 50))
  const { clause: whereClause, values } = buildSummaryFilters(filters)
  const summaryQueries: Record<Exclude<CollectionGroupBy, "none">, string> = {
    country: `
      SELECT co.name AS country, COUNT(DISTINCT b.banknoteid)::integer AS banknote_count
      FROM public.banknotes AS b
      LEFT JOIN public.currencies AS currency ON currency.currencyid = b.currencyid
      JOIN public.currencycountry AS cc ON cc.currencyid = b.currencyid
      JOIN public.countries AS co ON co.countryid = cc.countryid
      ${whereClause}
      GROUP BY co.name
      ORDER BY banknote_count DESC, country
      LIMIT ${safeLimit}
    `,
    currency: `
      SELECT currency.name AS currency, COUNT(*)::integer AS banknote_count
      FROM public.banknotes AS b
      LEFT JOIN public.currencies AS currency ON currency.currencyid = b.currencyid
      ${whereClause}
      GROUP BY currency.name
      ORDER BY banknote_count DESC, currency
      LIMIT ${safeLimit}
    `,
    year: `
      SELECT b.year, COUNT(*)::integer AS banknote_count
      FROM public.banknotes AS b
      LEFT JOIN public.currencies AS currency ON currency.currencyid = b.currencyid
      ${whereClause ? `${whereClause} AND b.year IS NOT NULL` : "WHERE b.year IS NOT NULL"}
      GROUP BY b.year
      ORDER BY b.year DESC
      LIMIT ${safeLimit}
    `,
    material: `
      SELECT b.material, COUNT(*)::integer AS banknote_count
      FROM public.banknotes AS b
      LEFT JOIN public.currencies AS currency ON currency.currencyid = b.currencyid
      ${whereClause}
      GROUP BY b.material
      ORDER BY banknote_count DESC, b.material
      LIMIT ${safeLimit}
    `,
    grade: `
      SELECT b.grade::text AS grade, COUNT(*)::integer AS banknote_count
      FROM public.banknotes AS b
      LEFT JOIN public.currencies AS currency ON currency.currencyid = b.currencyid
      ${whereClause}
      GROUP BY b.grade
      ORDER BY banknote_count DESC, grade
      LIMIT ${safeLimit}
    `,
  }

  if (groupBy !== "none") {
    return runReadOnlyQuery(userId, summaryQueries[groupBy], values, safeLimit)
  }

  return runReadOnlyQuery(
    userId,
    `SELECT COUNT(*)::integer AS banknote_count,
            MIN(b.year) AS oldest_year, MAX(b.year) AS newest_year,
            COUNT(DISTINCT b.currencyid)::integer AS currency_count
     FROM public.banknotes AS b
     LEFT JOIN public.currencies AS currency ON currency.currencyid = b.currencyid
     ${whereClause}`,
    values,
    1,
  )
}
