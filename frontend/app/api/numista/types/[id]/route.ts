import { type NextRequest, NextResponse } from "next/server"
import { cachedFetch } from "@/lib/cache"

const NUMISTA_API_KEY = process.env.NUMISTA_API_KEY
const NUMISTA_API_URL = "https://api.numista.com/v3"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: "Type ID is required" }, { status: 400 })
  }

  try {
    const data = await cachedFetch(
      `${NUMISTA_API_URL}/types/${id}`,
      {
        headers: {
          "Numista-API-Key": NUMISTA_API_KEY!,
        },
      },
      604800, // Cache for 1 week
    )
    console.log(data)
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error fetching data for type ${id} from Numista API:`, error)
    return NextResponse.json({ error: "Failed to fetch data from Numista API" }, { status: 500 })
  }
}

