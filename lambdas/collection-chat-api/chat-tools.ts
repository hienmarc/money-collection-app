import type { Tool } from "@aws-sdk/client-bedrock-runtime"
import {
  runReadOnlyQuery,
  searchBanknotes,
  summarizeCollection,
  type BanknoteQueryResult,
} from "./database"
import {
  parseBanknoteIdInput,
  parseBanknoteSearchInput,
  parseSqlInput,
  parseSummaryInput,
} from "./tool-inputs"

export interface ChatToolResult {
  value: unknown
  banknotes: BanknoteQueryResult[]
}

export const chatTools: Tool[] = [
  {
    toolSpec: {
      name: "search_banknotes",
      description:
        "Search the user's banknote collection by common filters. Prefer this for finding specific notes.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            banknote_id: { type: "integer", description: "Exact banknote ID, if known." },
            country: { type: "string", description: "Country name, partial matches allowed." },
            currency: { type: "string", description: "Currency name, partial matches allowed." },
            year_from: { type: "integer", description: "Minimum banknote year." },
            year_to: { type: "integer", description: "Maximum banknote year." },
            denomination: { type: "number", description: "Exact face denomination." },
            material: { type: "string", description: "Material name, partial matches allowed." },
            grade: { type: "string", description: "Condition grade, such as VF or UNC." },
            sort_by: {
              type: "string",
              enum: ["year", "added_on", "denomination", "physical_area", "width", "height"],
              description: "Field to sort by. physical_area uses width × height.",
            },
            sort_direction: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort ascending or descending. For smallest/largest physical note use physical_area with asc/desc.",
            },
            limit: { type: "integer", description: "Maximum results, from 1 to 50. Defaults to 20." },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: "get_banknote_details",
      description: "Get one banknote by its exact banknote ID.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            banknote_id: { type: "integer", description: "The banknote ID." },
          },
          required: ["banknote_id"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "summarize_collection",
      description:
        "Summarize the collection or count banknotes grouped by country, currency, year, material, or grade.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            group_by: {
              type: "string",
              enum: ["none", "country", "currency", "year", "material", "grade"],
              description: "Use none for overall collection totals.",
            },
            country: { type: "string", description: "Optional country filter." },
            currency: { type: "string", description: "Optional currency-name filter." },
            year_from: { type: "integer", description: "Optional minimum banknote year." },
            year_to: { type: "integer", description: "Optional maximum banknote year." },
            limit: { type: "integer", description: "Maximum groups, from 1 to 50. Defaults to 20." },
          },
          required: ["group_by"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "execute_readonly_sql",
      description:
        "Exploratory fallback only: run one read-only SELECT when the collection tools cannot answer the question. Use only relations and columns in the supplied schema. Never use writes, locks, session changes, or side-effecting functions.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            query: { type: "string", description: "One PostgreSQL SELECT query." },
          },
          required: ["query"],
        },
      },
    },
  },
]

export async function executeChatTool(
  userId: string,
  name: string,
  rawInput: unknown,
): Promise<ChatToolResult> {
  if (name === "search_banknotes" || name === "get_banknote_details") {
    const filters = name === "get_banknote_details"
      ? { banknoteId: parseBanknoteIdInput(rawInput), limit: 1 }
      : parseBanknoteSearchInput(rawInput)
    const banknotes = await searchBanknotes(userId, filters)
    return { value: banknotes, banknotes }
  }

  if (name === "summarize_collection") {
    const { groupBy, limit, filters } = parseSummaryInput(rawInput)
    const summary = await summarizeCollection(userId, groupBy, limit, filters)
    return { value: summary, banknotes: [] }
  }

  if (name === "execute_readonly_sql") {
    const sql = parseSqlInput(rawInput)
    const results = await runReadOnlyQuery(userId, sql)
    return { value: results, banknotes: results }
  }

  throw new Error(`Unknown chatbot tool: ${name}`)
}
