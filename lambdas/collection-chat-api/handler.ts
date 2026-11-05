import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda"
import { answerWithTools } from "./bedrock-chat"
import { getReadableSchema } from "./database"
import { authenticate, ApiError, parseChatRequest, response } from "./chat-request"
import { filterUnknownBanknoteImages } from "./chat-answer"

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  let stage = "route_validation"
  try {
    if (event.requestContext.http.method !== "POST" || event.rawPath.replace(/\/$/, "") !== "/v1/chat") {
      return response(404, { error: "Route not found." })
    }

    stage = "authentication"
    const user = await authenticate(event)
    const { question, history } = parseChatRequest(event)

    stage = "database_schema"
    const readableSchema = await getReadableSchema(user.id)
    stage = "bedrock_tool_orchestration"
    const result = await answerWithTools(question, history, user.id, readableSchema)
    const answer = filterUnknownBanknoteImages(result.answer, result.banknotes)

    return response(200, {
      answer,
      follow_up_questions: result.followUpQuestions,
    })
  } catch (error) {
    if (error instanceof ApiError) return response(error.statusCode, { error: error.message })

    console.error("Collection chatbot request failed.", {
      requestId: event.requestContext.requestId,
      stage,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: error && typeof error === "object" && "code" in error ? error.code : undefined,
    })
    return response(502, {
      error: "The collection assistant could not complete that search. Please try again.",
    })
  }
}
