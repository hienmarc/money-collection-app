import { NextResponse } from "next/server"
import { cachedFetch } from "@/lib/cache"

const NUMISTA_API_KEY = process.env.NUMISTA_API_KEY
const NUMISTA_API_URL = "https://api.numista.com/v3"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")
  const category = "banknote" // Set category to banknote

  if (!q) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
  }

  try {
    const data = await cachedFetch(
      `${NUMISTA_API_URL}/types?q=${encodeURIComponent(q)}&category=${category}`,
      {
        headers: {
          "Numista-API-Key": NUMISTA_API_KEY!,
        },
      },
      604800, // Cache for 1 week
    )

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching data from Numista API:", error)
    console.error({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
    return NextResponse.json({ error: "Failed to fetch data from Numista API" }, { status: 500 })
  }
}

