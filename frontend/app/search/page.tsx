import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"

async function searchAll(query: string) {
  const supabase = createClient()
  const [banknotes, currencies, countries, storageUnits] = await Promise.all([
    supabase
      .from("banknotes")
      .select(`
        *,
        currencies(code),
        countries(name)
      `)
      .or(`code.ilike.%${query}%,denomination::text.ilike.%${query}%,year::text.ilike.%${query}%`)
      .limit(5),
    supabase.from("currencies").select("*").or(`name.ilike.%${query}%,code.ilike.%${query}%`).limit(5),
    supabase.from("countries").select("*").or(`name.ilike.%${query}%,code.ilike.%${query}%`).limit(5),
    supabase.from("storageunits").select("*").or(`name.ilike.%${query}%,description.ilike.%${query}%`).limit(5),
  ])

  return {
    banknotes: banknotes.data || [],
    currencies: currencies.data || [],
    countries: countries.data || [],
    storageUnits: storageUnits.data || [],
  }
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q: string }> }) {
  const { q: query } = await searchParams

  if (!query) {
    notFound()
  }

  const results = await searchAll(query)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Search Results for "{query}"</h1>

      {Object.entries(results).map(
        ([category, items]) =>
          items.length > 0 && (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category.charAt(0).toUpperCase() + category.slice(1)}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.id || item.banknoteid || item.currencyid || item.countryid || item.storageunitid}>
                      <Link
                        href={`/${category}/${
                          item.id || item.banknoteid || item.currencyid || item.countryid || item.storageunitid
                        }`}
                        className="text-blue-600 hover:underline"
                      >
                        {category === "banknotes"
                          ? `${item.code} - ${item.denomination} ${item.currencies?.code} (${item.year}) - ${item.countries?.name}`
                          : item.name || item.code || `${item.denomination} ${item.currencies?.code}`}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ),
      )}

      {Object.values(results).every((items) => items.length === 0) && <p>No results found for "{query}"</p>}
    </div>
  )
}

