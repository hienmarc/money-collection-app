"use client"

import { useMemo, useRef, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { alpha2ToAlpha3, numericToAlpha3 } from "i18n-iso-countries"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import type { Country } from "@/hooks/use-countries"
import type { CountryMapCurrency } from "@/hooks/use-country-banknote-counts"

interface CountriesMapViewProps {
  countries: Country[]
  banknoteCounts: Record<number, number>
  countryCurrencies: Record<number, CountryMapCurrency[]>
  banknoteImagesByCurrency: Record<number, string>
  collectionCurrencies: CountryMapCurrency[]
  isLoading: boolean
  error: Error | null
}

type MapDisplayMode = "banknotes" | "currencies"

const MIN_COLOR = "#e2e8f0"
const INITIAL_BUCKET_COLORS = [MIN_COLOR, "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6"]
const CURRENCY_HUE_STEP = 137.508

function getCurrencyPatternId(currencyIds: number[]) {
  return `currency-pattern-${currencyIds.join("-")}`
}

function getBucketIndex(count: number) {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count <= 5) return 2
  if (count <= 10) return 3
  return Math.ceil((count - 10) / 10) + 3
}

function getBucketLabel(bucketIndex: number) {
  if (bucketIndex === 0) return "0"
  if (bucketIndex === 1) return "1"
  if (bucketIndex === 2) return "2–5"
  if (bucketIndex === 3) return "6–10"

  const start = 11 + (bucketIndex - 4) * 10
  return `${start}–${start + 9}`
}

function getBucketColor(bucketIndex: number, maxBucketIndex: number) {
  if (bucketIndex < INITIAL_BUCKET_COLORS.length) return INITIAL_BUCKET_COLORS[bucketIndex]

  const ratio = (bucketIndex - 4) / Math.max(maxBucketIndex - 4, 1)
  const start = [59, 130, 246]
  const end = [30, 58, 138]
  const channels = start.map((value, index) => Math.round(value + (end[index] - value) * ratio))
  return `rgb(${channels.join(", ")})`
}

function getFlagEmoji(countryCode: string) {
  const code = countryCode.toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️"
  return Array.from(code, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))).join("")
}

export function CountriesMapView({
  countries,
  banknoteCounts,
  countryCurrencies,
  banknoteImagesByCurrency,
  collectionCurrencies,
  isLoading,
  error,
}: CountriesMapViewProps) {
  const router = useRouter()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [displayMode, setDisplayMode] = useState<MapDisplayMode>("banknotes")
  const [activeCountry, setActiveCountry] = useState<{
    country: Country
    count: number
    x: number
    y: number
  } | null>(null)

  const countriesByAlpha3 = useMemo(() => {
    const result = new Map<string, Country>()
    for (const country of countries) {
      const alpha3 = alpha2ToAlpha3(country.code.toUpperCase())
      if (alpha3) result.set(alpha3, country)
    }
    return result
  }, [countries])

  const countriesCollected = countries.filter((country) => (banknoteCounts[country.countryid] || 0) > 0).length
  const maxBucketIndex = countries.reduce(
    (max, country) => Math.max(max, getBucketIndex(banknoteCounts[country.countryid] || 0)),
    0,
  )
  const collectionCurrencyIds = useMemo(
    () => new Set(collectionCurrencies.map((currency) => currency.currencyid)),
    [collectionCurrencies],
  )
  const countryCurrencyIds = useMemo(() => {
    const result = new Map<number, number[]>()
    for (const country of countries) {
      const ids = (countryCurrencies[country.countryid] || [])
        .filter((currency) => collectionCurrencyIds.has(currency.currencyid))
        .map((currency) => currency.currencyid)
        .sort((a, b) => a - b)
      result.set(country.countryid, ids)
    }
    return result
  }, [countries, countryCurrencies, collectionCurrencyIds])
  const currencyColors = useMemo(
    () => new Map(collectionCurrencies.map((currency, index) => [
      currency.currencyid,
      `hsl(${Math.round((index * CURRENCY_HUE_STEP) % 360)} 70% 48%)`,
    ])),
    [collectionCurrencies],
  )
  const currencyPatterns = useMemo(() => {
    const patterns = new Map<string, number[]>()
    for (const ids of countryCurrencyIds.values()) {
      if (ids.length > 1) patterns.set(getCurrencyPatternId(ids), ids)
    }
    return Array.from(patterns, ([id, ids]) => ({ id, ids }))
  }, [countryCurrencyIds])
  const countriesWithCollectedCurrencies = countries.filter(
    (country) => (countryCurrencyIds.get(country.countryid)?.length || 0) > 0,
  ).length
  const activeCountryCurrencies = activeCountry
    ? countryCurrencies[activeCountry.country.countryid] || []
    : []
  const activeCollectionCurrencyCount = activeCountryCurrencies.filter(
    (currency) => currencyColors.has(currency.currencyid),
  ).length

  const showCountryTooltip = (country: Country, count: number, event?: MouseEvent<SVGPathElement>) => {
    const bounds = mapContainerRef.current?.getBoundingClientRect()
    const tooltipWidth = 320
    const tooltipHeight = 260
    const x = event && bounds
      ? Math.min(Math.max(event.clientX - bounds.left + 12, 8), Math.max(8, bounds.width - tooltipWidth))
      : 12
    const y = event && bounds
      ? Math.min(Math.max(event.clientY - bounds.top + 12, 8), Math.max(8, bounds.height - tooltipHeight))
      : 12

    setActiveCountry({ country, count, x, y })
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{displayMode === "banknotes" ? "Banknotes by country" : "Currencies by country"}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {displayMode === "banknotes"
              ? `${countriesCollected} ${countriesCollected === 1 ? "country" : "countries"} with banknotes in your collection`
              : `${collectionCurrencies.length} ${collectionCurrencies.length === 1 ? "currency" : "currencies"} in your collection across ${countriesWithCollectedCurrencies} ${countriesWithCollectedCurrencies === 1 ? "country" : "countries"}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div role="group" aria-label="Map data mode" className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={displayMode === "banknotes" ? "default" : "outline"}
              aria-pressed={displayMode === "banknotes"}
              onClick={() => setDisplayMode("banknotes")}
            >
              Banknotes
            </Button>
            <Button
              type="button"
              size="sm"
              variant={displayMode === "currencies" ? "default" : "outline"}
              aria-pressed={displayMode === "currencies"}
              onClick={() => setDisplayMode("currencies")}
            >
              Currencies
            </Button>
          </div>
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading country map details" />}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            Could not load country map details: {error.message}
          </p>
        )}
        <div ref={mapContainerRef} className="relative w-full">
          <ComposableMap
            width={980}
            height={520}
            projection="geoEqualEarth"
            projectionConfig={{ scale: 155 }}
            className="h-auto w-full"
            aria-label={displayMode === "banknotes"
              ? "World map shaded by the number of banknotes collected from each country"
              : "World map colored by currencies in your collection used by each country"}
          >
            <defs>
              {currencyPatterns.map(({ id, ids }) => (
                <pattern
                  key={id}
                  id={id}
                  patternUnits="userSpaceOnUse"
                  width={ids.length * 8}
                  height="16"
                  patternTransform="rotate(45)"
                >
                  {ids.map((currencyId, index) => (
                    <rect
                      key={currencyId}
                      x={index * 8}
                      y="0"
                      width="8"
                      height="16"
                      fill={currencyColors.get(currencyId) || MIN_COLOR}
                    />
                  ))}
                </pattern>
              ))}
            </defs>
            <Geographies geography="/countries-110m.json">
              {({ geographies }) =>
                geographies.map((geography) => {
                  const alpha3 = numericToAlpha3(String(geography.id))
                  const country = alpha3 ? countriesByAlpha3.get(alpha3) : undefined
                  const count = country ? banknoteCounts[country.countryid] || 0 : 0
                  const currencyIds = country ? countryCurrencyIds.get(country.countryid) || [] : []
                  const fill = displayMode === "banknotes"
                    ? getBucketColor(getBucketIndex(count), maxBucketIndex)
                    : currencyIds.length === 0
                      ? MIN_COLOR
                      : currencyIds.length === 1
                        ? currencyColors.get(currencyIds[0]) || MIN_COLOR
                        : `url(#${getCurrencyPatternId(currencyIds)})`
                  const isActive = activeCountry?.country.countryid === country?.countryid

                  return (
                    <Geography
                      key={geography.rsmKey}
                      geography={geography}
                      tabIndex={country ? 0 : -1}
                      role={country ? "link" : undefined}
                      aria-label={country
                        ? displayMode === "banknotes"
                          ? `${country.name} (${country.code}): ${count} ${count === 1 ? "banknote" : "banknotes"}`
                          : `${country.name} (${country.code}): ${currencyIds.length} ${currencyIds.length === 1 ? "collected currency" : "collected currencies"}`
                        : undefined}
                      aria-describedby={country && isActive ? "country-map-tooltip" : undefined}
                      onMouseEnter={(event) => country && showCountryTooltip(country, count, event)}
                      onMouseLeave={() => setActiveCountry(null)}
                      onFocus={() => country && showCountryTooltip(country, count)}
                      onBlur={() => setActiveCountry(null)}
                      onClick={() => country && router.push(`/countries/${country.countryid}`)}
                      onKeyDown={(event) => {
                        if (country && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault()
                          router.push(`/countries/${country.countryid}`)
                        }
                      }}
                      fill={fill}
                      stroke={isActive ? "#0f172a" : "#64748b"}
                      strokeWidth={isActive ? 1.1 : 0.45}
                      style={{ outline: "none", cursor: country ? "pointer" : "default" }}
                    />
                  )
                })
              }
            </Geographies>
          </ComposableMap>
          {activeCountry && (
            <div
              id="country-map-tooltip"
              role="tooltip"
              className="pointer-events-none absolute z-10 max-h-64 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md"
              style={{ left: activeCountry.x, top: activeCountry.y }}
            >
              <div className="flex items-center gap-2">
                <span
                  role="img"
                  aria-label={`Flag of ${activeCountry.country.name}`}
                  className="relative flex h-5 w-8 shrink-0 items-center justify-center overflow-hidden"
                >
                  <span aria-hidden="true">{getFlagEmoji(activeCountry.country.code)}</span>
                  {activeCountry.country.flagUrl && (
                    <img
                      src={activeCountry.country.flagUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display = "none"
                      }}
                    />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {activeCountry.country.name} ({activeCountry.country.code})
                  </p>
                  <p>
                    {displayMode === "banknotes"
                      ? `${activeCountry.count.toLocaleString()} ${activeCountry.count === 1 ? "banknote" : "banknotes"}`
                      : `${activeCollectionCurrencyCount} ${activeCollectionCurrencyCount === 1 ? "collected currency" : "collected currencies"}`}
                  </p>
                </div>
              </div>
              <div className="mt-2 space-y-2 border-t pt-2">
                <p className="font-medium">Currencies</p>
                {isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading currency details...</p>
                ) : countryCurrencies[activeCountry.country.countryid]?.length ? (
                  countryCurrencies[activeCountry.country.countryid].map((currency) => {
                    const image = banknoteImagesByCurrency[currency.currencyid]
                    const color = currencyColors.get(currency.currencyid)
                    return (
                      <div key={currency.currencyid} className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            aria-label={color ? "In collection" : "Not in collection"}
                            className="h-3 w-3 shrink-0 rounded-sm border border-slate-400"
                            style={color ? { backgroundColor: color } : undefined}
                          />
                          <div className="min-w-0">
                            <p className="font-medium">{currency.code}</p>
                            <p className="truncate text-xs text-muted-foreground">{currency.name}</p>
                          </div>
                        </div>
                        {image ? (
                          <img
                            src={image}
                            alt={`${currency.code} banknote`}
                            className="h-12 w-20 shrink-0 rounded border bg-background object-contain"
                          />
                        ) : (
                          <span className="shrink-0 text-xs text-muted-foreground">No image</span>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-muted-foreground">No currencies listed</p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          {displayMode === "banknotes" ? (
            <>
              <span className="font-medium text-foreground">Banknotes</span>
              {Array.from({ length: maxBucketIndex + 1 }, (_, bucketIndex) => (
                <span key={bucketIndex} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm border border-slate-400"
                    style={{ backgroundColor: getBucketColor(bucketIndex, maxBucketIndex) }}
                  />
                  {getBucketLabel(bucketIndex)}
                </span>
              ))}
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">Currencies</span>
              {collectionCurrencies.length ? collectionCurrencies.map((currency) => (
                <span key={currency.currencyid} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm border border-slate-400"
                    style={{ backgroundColor: currencyColors.get(currency.currencyid) }}
                  />
                  {currency.code}
                </span>
              )) : (
                <span>No currencies in your collection</span>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
