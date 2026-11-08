"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { alpha2ToAlpha3, numericToAlpha3 } from "i18n-iso-countries"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import type { Country } from "@/hooks/use-countries"

interface CountriesMapViewProps {
  countries: Country[]
  banknoteCounts: Record<number, number>
  isLoading: boolean
  error: Error | null
}

const LEGEND = [
  { label: "0", color: "#e2e8f0" },
  { label: "1", color: "#bfdbfe" },
  { label: "2–4", color: "#60a5fa" },
  { label: "5–9", color: "#2563eb" },
  { label: "10+", color: "#1e3a8a" },
]

function getCountryColor(count: number) {
  if (count >= 10) return LEGEND[4].color
  if (count >= 5) return LEGEND[3].color
  if (count >= 2) return LEGEND[2].color
  if (count === 1) return LEGEND[1].color
  return LEGEND[0].color
}

export function CountriesMapView({ countries, banknoteCounts, isLoading, error }: CountriesMapViewProps) {
  const router = useRouter()
  const [activeCountry, setActiveCountry] = useState<{ country: Country; count: number } | null>(null)

  const countriesByAlpha3 = useMemo(() => {
    const result = new Map<string, Country>()
    for (const country of countries) {
      const alpha3 = alpha2ToAlpha3(country.code.toUpperCase())
      if (alpha3) result.set(alpha3, country)
    }
    return result
  }, [countries])

  const countriesCollected = countries.filter((country) => (banknoteCounts[country.countryid] || 0) > 0).length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Banknotes by country</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeCountry
              ? `${activeCountry.country.name}: ${activeCountry.count} ${activeCountry.count === 1 ? "banknote" : "banknotes"}`
              : `${countriesCollected} ${countriesCollected === 1 ? "country" : "countries"} with banknotes in your collection`}
          </p>
        </div>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading banknote counts" />}
      </CardHeader>
      <CardContent>
        {error && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            Could not load banknote counts: {error.message}
          </p>
        )}
        <div className="w-full overflow-hidden">
          <ComposableMap
            width={980}
            height={520}
            projection="geoEqualEarth"
            projectionConfig={{ scale: 155 }}
            className="h-auto w-full"
            aria-label="World map shaded by the number of banknotes collected from each country"
          >
            <Geographies geography="/countries-110m.json">
              {({ geographies }) =>
                geographies.map((geography) => {
                  const alpha3 = numericToAlpha3(String(geography.id))
                  const country = alpha3 ? countriesByAlpha3.get(alpha3) : undefined
                  const count = country ? banknoteCounts[country.countryid] || 0 : 0

                  return (
                    <Geography
                      key={geography.rsmKey}
                      geography={geography}
                      tabIndex={country ? 0 : -1}
                      role={country ? "link" : undefined}
                      aria-label={country ? `${country.name}: ${count} banknotes` : undefined}
                      onMouseEnter={() => country && setActiveCountry({ country, count })}
                      onMouseLeave={() => setActiveCountry(null)}
                      onFocus={() => country && setActiveCountry({ country, count })}
                      onBlur={() => setActiveCountry(null)}
                      onClick={() => country && router.push(`/countries/${country.countryid}`)}
                      onKeyDown={(event) => {
                        if (country && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault()
                          router.push(`/countries/${country.countryid}`)
                        }
                      }}
                      fill={getCountryColor(count)}
                      stroke={activeCountry?.country.countryid === country?.countryid ? "#0f172a" : "#64748b"}
                      strokeWidth={activeCountry?.country.countryid === country?.countryid ? 1.1 : 0.45}
                      style={{ outline: "none", cursor: country ? "pointer" : "default" }}
                    />
                  )
                })
              }
            </Geographies>
          </ComposableMap>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Banknotes</span>
          {LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border border-slate-400" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
