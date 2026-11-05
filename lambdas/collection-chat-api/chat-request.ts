import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda"
import type { ChatMessage } from "./bedrock-chat"

const supabaseUrl = requiredEnvironment("SUPABASE_URL").replace(/\/$/, "")
const supabaseAnonKey = requiredEnvironment("SUPABASE_ANON_KEY")
const maxQuestionLength = 1000

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message)
  }
}

export interface AuthenticatedUser {
  id: string
}

export interface ChatRequest {
  question: string
  history: ChatMessage[]
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export function response(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }
}

export async function authenticate(event: APIGatewayProxyEventV2): Promise<AuthenticatedUser> {
  const authorization = event.headers.authorization ?? event.headers.Authorization ?? ""
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    throw new ApiError(401, "Authentication is required.")
  }

  let result: Response
  try {
    result = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, authorization },
      signal: AbortSignal.timeout(8000),
    })
  } catch (error) {
    console.error("Supabase session validation request failed.", error)
    throw new ApiError(502, "Unable to validate the session.")
  }

  if ([400, 401, 403].includes(result.status)) {
    throw new ApiError(401, "The session is invalid or expired.")
  }
  if (!result.ok) throw new ApiError(502, "Unable to validate the session.")

  const user: unknown = await result.json().catch(() => null)
  if (!user || typeof user !== "object" || !("id" in user) || typeof user.id !== "string" || !user.id) {
    throw new ApiError(401, "The session did not identify a user.")
  }
  return { id: user.id }
}

export function parseChatRequest(event: APIGatewayProxyEventV2): ChatRequest {
  if (event.isBase64Encoded) throw new ApiError(400, "Encoded request bodies are not supported.")

  let body: unknown
  try {
    body = JSON.parse(event.body || "{}")
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.")
  }

  if (!body || typeof body !== "object" || Array.isArray(body) || !("question" in body)) {
    throw new ApiError(400, "A question is required.")
  }

  const request = body as Record<string, unknown>
  const question = request.question
  if (typeof question !== "string" || !question.trim() || question.length > maxQuestionLength) {
    throw new ApiError(400, `Question must contain 1 to ${maxQuestionLength} characters.`)
  }

  const rawHistory = request.history ?? []
  if (!Array.isArray(rawHistory) || rawHistory.length > 8) {
    throw new ApiError(400, "Conversation history must contain at most 8 messages.")
  }
  const history = rawHistory.map((message): ChatMessage => {
    if (
      !message ||
      typeof message !== "object" ||
      !("role" in message) ||
      !("content" in message) ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" ||
      message.content.length > maxQuestionLength
    ) {
      throw new ApiError(400, "Conversation history contains an invalid message.")
    }
    return { role: message.role, content: message.content }
  })
  if (history.reduce((length, message) => length + message.content.length, question.length) > 4000) {
    throw new ApiError(400, "Conversation history is too long.")
  }
  return { question: question.trim(), history }
}
