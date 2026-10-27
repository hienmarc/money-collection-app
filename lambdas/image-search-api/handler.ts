import { randomUUID } from "node:crypto"
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb"
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const s3 = new S3Client({})
const tableName = requiredEnvironment("JOBS_TABLE")
const bucket = requiredEnvironment("IMAGES_BUCKET")
const supabaseUrl = requiredEnvironment("SUPABASE_URL").replace(/\/$/, "")
const supabaseAnonKey = requiredEnvironment("SUPABASE_ANON_KEY")
const maxUploadBytes = Number.parseInt(process.env.MAX_UPLOAD_BYTES ?? "5242880", 10)
const uploadUrlTtlSeconds = Number.parseInt(process.env.UPLOAD_URL_TTL_SECS ?? "300", 10)
const imageUrlTtlSeconds = Number.parseInt(process.env.IMAGE_URL_TTL_SECS ?? "900", 10)
const maxImageSearchesPerPage = 50
const retentionSeconds = 3 * 24 * 60 * 60
const allowedContentTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
])

class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message)
  }
}

interface ImageSearchJob {
  owner_id: string
  job_id: string
  created_at: string
  created_key: string
  expires_at: number
  object_key: string
  content_type: string
  status: string
  lease_until?: number
  identification?: Record<string, string | null>
  search_query?: string
  results?: Record<string, unknown>[]
  error?: string
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function response(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }
}

async function authenticate(event: APIGatewayProxyEventV2): Promise<string> {
  const authorization = event.headers.authorization ?? event.headers.Authorization ?? ""
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    throw new ApiError(401, "Authentication is required.")
  }

  let result: Response
  try {
    result = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        authorization,
      },
      signal: AbortSignal.timeout(8_000),
    })
  } catch (error) {
    console.error("Supabase session validation request failed.", error)
    throw new ApiError(502, "Unable to validate the session.")
  }

  if ([400, 401, 403].includes(result.status)) {
    throw new ApiError(401, "The session is invalid or expired.")
  }
  if (!result.ok) {
    throw new ApiError(502, "Unable to validate the session.")
  }

  const user: unknown = await result.json().catch(() => null)
  if (!user || typeof user !== "object" || !("id" in user) || typeof user.id !== "string" || !user.id) {
    throw new ApiError(401, "The session did not identify a user.")
  }
  return user.id
}

function parseBody(event: APIGatewayProxyEventV2): Record<string, unknown> {
  if (event.isBase64Encoded) {
    throw new ApiError(400, "Encoded request bodies are not supported.")
  }

  let body: unknown
  try {
    body = JSON.parse(event.body || "{}")
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.")
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Request body must be a JSON object.")
  }
  return body as Record<string, unknown>
}

async function makeUpload(userId: string, body: Record<string, unknown>): Promise<APIGatewayProxyStructuredResultV2> {
  const contentType = body.content_type
  if (typeof contentType !== "string" || !allowedContentTypes.has(contentType)) {
    throw new ApiError(400, "Only JPEG and PNG images are supported.")
  }
  const size = body.size
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1 || size > maxUploadBytes) {
    throw new ApiError(400, `Image size must be between 1 and ${maxUploadBytes} bytes.`)
  }

  const now = Math.floor(Date.now() / 1000)
  const createdAt = new Date(now * 1000).toISOString()
  const jobId = randomUUID()
  const objectKey = `users/${userId}/${jobId}.${allowedContentTypes.get(contentType)}`
  const item: ImageSearchJob = {
    owner_id: userId,
    job_id: jobId,
    created_at: createdAt,
    created_key: `${createdAt}#${jobId}`,
    expires_at: now + retentionSeconds,
    object_key: objectKey,
    content_type: contentType,
    status: "awaiting_upload",
  }

  const upload = await createPresignedPost(s3, {
    Bucket: bucket,
    Key: objectKey,
    Fields: { "Content-Type": contentType },
    Conditions: [
      { "Content-Type": contentType },
      ["content-length-range", 1, maxUploadBytes],
    ],
    Expires: uploadUrlTtlSeconds,
  })

  await dynamodb.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(owner_id) AND attribute_not_exists(job_id)",
    }),
  )
  return response(201, { job_id: jobId, status: item.status, upload })
}

async function serializeItem(item: ImageSearchJob) {
  if (item.status === "processing" && (item.lease_until ?? 0) < Math.floor(Date.now() / 1000)) {
    const now = Math.floor(Date.now() / 1000)
    try {
      await dynamodb.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { owner_id: item.owner_id, job_id: item.job_id },
          UpdateExpression: "SET #status = :failed, #error = :error, updated_at = :updated REMOVE lease_until",
          ConditionExpression: "attribute_exists(owner_id) AND #status = :processing AND lease_until < :now",
          ExpressionAttributeNames: { "#status": "status", "#error": "error" },
          ExpressionAttributeValues: {
            ":failed": "failed",
            ":processing": "processing",
            ":error": "Processing stopped unexpectedly. Please try another image.",
            ":updated": String(now),
            ":now": now,
          },
        }),
      )
      item.status = "failed"
      item.error = "Processing stopped unexpectedly. Please try another image."
    } catch (error) {
      if (!isConditionalCheckFailure(error)) throw error
    }
  }

  const serialized: Record<string, unknown> = {
    job_id: item.job_id,
    status: item.status,
    created_at: item.created_at,
    expires_at: item.expires_at,
    identification: item.identification,
    search_query: item.search_query,
    results: item.results ?? [],
    error: item.error,
  }
  if (item.object_key && item.status !== "awaiting_upload") {
    serialized.image_url = await presignImage(item.object_key)
  }
  return serialized
}

function isConditionalCheckFailure(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "name" in error && error.name === "ConditionalCheckFailedException")
}

async function presignImage(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: imageUrlTtlSeconds,
  })
}

async function getJob(userId: string, jobId: string): Promise<ImageSearchJob> {
  const result = await dynamodb.send(
    new GetCommand({
      TableName: tableName,
      Key: { owner_id: userId, job_id: jobId },
    }),
  )
  if (!result.Item) throw new ApiError(404, "Image search was not found.")
  return result.Item as ImageSearchJob
}

async function listJobs(
  userId: string,
  queryParameters: Record<string, string | undefined>,
): Promise<APIGatewayProxyStructuredResultV2> {
  const query: ConstructorParameters<typeof QueryCommand>[0] = {
    TableName: tableName,
    IndexName: "owner-created-index",
    KeyConditionExpression: "owner_id = :owner_id",
    ExpressionAttributeValues: { ":owner_id": userId },
    ScanIndexForward: false,
    Limit: maxImageSearchesPerPage,
  }
  if (queryParameters.cursor) {
    if (queryParameters.cursor.length > 4096) throw new ApiError(400, "Invalid pagination cursor.")
    let exclusiveStartKey: unknown
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(queryParameters.cursor, "base64url").toString("utf8"))
    } catch {
      throw new ApiError(400, "Invalid pagination cursor.")
    }
    if (
      !exclusiveStartKey ||
      typeof exclusiveStartKey !== "object" ||
      !("owner_id" in exclusiveStartKey) ||
      exclusiveStartKey.owner_id !== userId ||
      !("job_id" in exclusiveStartKey) ||
      typeof exclusiveStartKey.job_id !== "string" ||
      !("created_key" in exclusiveStartKey) ||
      typeof exclusiveStartKey.created_key !== "string"
    ) {
      throw new ApiError(400, "Invalid pagination cursor.")
    }
    query.ExclusiveStartKey = exclusiveStartKey as Record<string, unknown>
  }

  const result = await dynamodb.send(new QueryCommand(query))
  const jobs = await Promise.all((result.Items ?? []).map((item) => serializeItem(item as ImageSearchJob)))
  return response(200, {
    jobs,
    next_cursor: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64url")
      : null,
  })
}

async function deleteJob(userId: string, jobId: string): Promise<APIGatewayProxyStructuredResultV2> {
  const item = await getJob(userId, jobId)
  if (item.object_key) {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: item.object_key }))
  }
  await dynamodb.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { owner_id: userId, job_id: jobId },
      ConditionExpression: "attribute_exists(owner_id)",
    }),
  )
  return response(200, { job_id: jobId, deleted: true })
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = await authenticate(event)
    const method = event.requestContext.http.method
    const path = event.rawPath.replace(/\/$/, "")
    const jobId = event.pathParameters?.jobId

    if (method === "POST" && path === "/v1/image-searches") {
      return await makeUpload(userId, parseBody(event))
    }
    if (method === "GET" && path === "/v1/image-searches") {
      return await listJobs(userId, event.queryStringParameters ?? {})
    }
    if (method === "GET" && jobId) {
      return response(200, await serializeItem(await getJob(userId, jobId)))
    }
    if (method === "DELETE" && jobId) {
      return await deleteJob(userId, jobId)
    }
    return response(404, { error: "Route not found." })
  } catch (error) {
    if (error instanceof ApiError) {
      return response(error.statusCode, { error: error.message })
    }
    console.error("Image-search API request failed.", error)
    throw error
  }
}
