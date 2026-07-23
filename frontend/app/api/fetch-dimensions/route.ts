import { NextResponse } from "next/server"
import axios from "axios"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
      },
    })

    if (response.status === 200) {
      const htmlContent = response.data

      // Simple string parsing to find dimensions
      const dimensionsMatch = htmlContent.match(/Size<\/th>\s*<td[^>]*>(.*?)<\/td>/i)

      if (dimensionsMatch && dimensionsMatch[1]) {
        const dimensionText = dimensionsMatch[1].trim()
        const dimensions = dimensionText.split("×")

        if (dimensions.length >= 2) {
          const width = parseInt(dimensions[0].trim())
          const height = parseInt(dimensions[1].trim().split("&")[0])

          return NextResponse.json({ width, height })
        }
      }

      return NextResponse.json({ error: "Dimensions not found in the page content" }, { status: 404 })
    } else {
      return NextResponse.json({ error: "Failed to fetch the page" }, { status: response.status })
    }
  } catch (error) {
    console.error("Error:", error.message)
    return NextResponse.json({ error: `An error occurred while fetching dimensions: ${error.message}`  }, { status: 500 })
  }
}

