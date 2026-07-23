import { NextResponse, NextRequest } from "next/server"
import { redis } from "@/lib/redis"

// Helper function to fetch with automatic 5-second retry on 429 Too Many Requests
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<any> {
  const response = await fetch(url, options)
  
  if (response.status === 429 && retries > 0) {
    console.warn(`Rate limited (429) by REST Countries API. Retrying in 5 seconds... (${retries} retries left)`)
    await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait for 5 seconds before retrying
    return fetchWithRetry(url, options, retries - 1)
  }

  if (!response.ok) {
    throw new Error(`REST Countries API responded with status ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get("name")

  if (!name) {
    return NextResponse.json({ error: "Missing name parameter" }, { status: 400 })
  }

  try {
    const encodedName = encodeURIComponent(name)
    const fields = searchParams.get("response_fields")
    
    // Construct the destination URL
    const targetUrl = new URL(`https://api.restcountries.com/countries/v5/names.common/${encodedName}`)
    if (fields) {
      targetUrl.searchParams.set("response_fields", fields)
    }

    const cacheKey = `cache:${targetUrl.toString()}`

    // 1. Try cache hit
    const cachedResponse = await redis.get(cacheKey)
    if (cachedResponse) {
      return NextResponse.json(cachedResponse)
    }

    // 2. Fetch with 429 retry
    const data = await fetchWithRetry(
      targetUrl.toString(),
      {
        headers: { Authorization: `Bearer ${process.env.REST_COUNTRIES_API_KEY}` }
      }
    )

    // 3. Cache the successful result for 3 days
    await redis.set(cacheKey, JSON.stringify(data), { ex: 259200 })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error fetching country details:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
