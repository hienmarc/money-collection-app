import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

interface RestCountry {
  names: {
    common: string
    official: string
  }
  codes: {
    alpha_2: string
    alpha_3: string
  }
  flag: {
    emoji: string
    url_svg: string
    url_png?: string
  }
  region: string
  subregion?: string
}

export async function GET() {
  try {
    // Fetch all countries from REST Countries API using v5 pagination
    const supabase = await createClient()
    let allCountries: RestCountry[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const response = await fetch(
        `https://api.restcountries.com/countries/v5?limit=100&offset=${offset}&response_fields=names.common,names.official,codes.alpha_2,codes.alpha_3,flag.emoji,flag.url_svg,region,subregion`,
        { headers: { Authorization: `Bearer ${process.env.REST_COUNTRIES_API_KEY}` } }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch countries from API at offset ${offset}`)
      }

      const resJson = await response.json()
      const countries: RestCountry[] = resJson.data?.objects || []
      allCountries = allCountries.concat(countries)

      hasMore = resJson.data?.meta?.more || false
      if (hasMore) {
        offset += 100
      }
    }

    // Fetch existing countries from database
    const { data: existingCountries, error } = await supabase.from("countries").select("code, name")

    if (error) {
      throw new Error("Failed to fetch existing countries from database")
    }

    // Create a set of existing country codes for quick lookup
    const existingCodes = new Set(existingCountries?.map((country) => country.code.toUpperCase()) || [])

    // Filter out countries that already exist in the database
    const availableCountries = allCountries
      .filter(
        (country) =>
          country.codes?.alpha_2 &&
          country.codes?.alpha_3 &&
          !existingCodes.has(country.codes.alpha_2.toUpperCase()) &&
          !existingCodes.has(country.codes.alpha_3.toUpperCase()),
      )
      .map((country) => ({
        name: country.names.common,
        officialName: country.names.official,
        code: country.codes.alpha_2,
        code3: country.codes.alpha_3,
        flag: country.flag.emoji,
        flagUrl: country.flag.url_svg,
        region: country.region,
        subregion: country.subregion || "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(availableCountries)
  } catch (error) {
    console.error("Error fetching available countries:", error)
    return NextResponse.json({ error: "Failed to fetch available countries" }, { status: 500 })
  }
}
