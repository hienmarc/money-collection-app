import { NextResponse } from "next/server"
import { cachedFetch } from "@/lib/cache"

const API_KEY = process.env.EXCHANGERATES_API_KEY
const API_URL = "http://api.exchangeratesapi.io/v1/latest"

export async function GET() {
  if (!API_KEY) {
    console.error("EXCHANGERATES_API_KEY is not set")
    return NextResponse.json({ error: "API key is not configured" }, { status: 500 })
  }

  try {
    const data = await cachedFetch(
      `${API_URL}?access_key=${API_KEY}`,
      {},
      86400,
    )

    if (data.success === false) {
      throw new Error(data.error.type)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching exchange rates:", error)
    return NextResponse.json({ error: `Failed to fetch exchange rates: ${error.message}` }, { status: 500 })
  }
}

