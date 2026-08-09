import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET() {
  const supabase = await createClient()
  try {
    // Fetch all countries with their currencies from REST Countries API using v5 pagination
    let allCountries: any[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const response = await fetch(
        `https://api.restcountries.com/countries/v5?limit=100&offset=${offset}&response_fields=names.common,currencies,codes.alpha_2,codes.alpha_3,flag.emoji`,
        { headers: { Authorization: `Bearer ${process.env.REST_COUNTRIES_API_KEY}` } }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch countries data at offset ${offset}`)
      }

      const resJson = await response.json()
      const countries = resJson.data?.objects || []
      allCountries = allCountries.concat(countries)

      hasMore = resJson.data?.meta?.more || false
      if (hasMore) {
        offset += 100
      }
    }

    // Extract unique currencies
    const currencyMap = new Map()

    allCountries.forEach((country: any) => {
      if (Array.isArray(country.currencies)) {
        country.currencies.forEach((currencyData: any) => {
          const code = currencyData.code
          if (code) {
            const commonName = country.names?.common || ""
            if (!currencyMap.has(code)) {
              currencyMap.set(code, {
                code,
                name: currencyData.name || "",
                symbol: currencyData.symbol || "",
                countries: commonName ? [commonName] : [],
              })
            } else {
              // Add country to existing currency
              const existing = currencyMap.get(code)
              if (commonName && !existing.countries.includes(commonName)) {
                existing.countries.push(commonName)
              }
            }
          }
        })
      }
    })

    // Convert map to array and sort by name
    const availableCurrencies = Array.from(currencyMap.values()).sort((a, b) => a.name.localeCompare(b.name))

    // Fetch existing currencies from database
    const { data: existingCurrencies, error } = await supabase.from("currencies").select("code")

    if (error) {
      console.error("Error fetching existing currencies:", error)
      return NextResponse.json({ error: "Failed to fetch existing currencies" }, { status: 500 })
    }

    const existingCodes = new Set(existingCurrencies.map((c) => c.code))

    // Filter out currencies that already exist
    const newCurrencies = availableCurrencies.filter((currency) => !existingCodes.has(currency.code))

    return NextResponse.json({
      available: newCurrencies,
      existing: existingCurrencies.length,
      total: availableCurrencies.length,
    })
  } catch (error) {
    console.error("Error fetching available currencies:", error)
    return NextResponse.json({ error: "Failed to fetch available currencies" }, { status: 500 })
  }
}
