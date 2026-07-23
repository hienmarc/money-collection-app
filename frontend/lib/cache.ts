import { redis } from "./redis"

export async function cachedFetch(
  url: string,
  options: RequestInit = {},
  ttl = 3600, // Default TTL: 1 hour
) {
  const cacheKey = `cache:${url}`
  const cachedResponse = await redis.get(cacheKey)

  if (cachedResponse) {
    return cachedResponse
  }

  const response = await fetch(url, options)
  const data = await response.json()

  await redis.set(cacheKey, JSON.stringify(data), { ex: ttl })

  return data
}

