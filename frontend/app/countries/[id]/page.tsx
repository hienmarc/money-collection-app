"use client"

import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import BanknoteCard from "@/components/BanknoteCard"
import { Globe, MapPin, Landmark, CreditCard, Edit, ArrowLeft, ExternalLink, Banknote, Info, Users, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useQuery } from "@tanstack/react-query"

export default function CountryDetailsPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: country, isLoading, error } = useQuery({
    queryKey: ["country", params.id],
    queryFn: async () => {
      const { data, error: countryError } = await supabase
        .from("countries")
        .select(`
          *,
          currencycountry(
            currencyid,
            currencies(
              *,
              banknotes(*, currencies(name, code))
            )
          )
        `)
        .eq("countryid", params.id)
        .single()

      if (countryError) {
        throw countryError
      }

      if (data) {
        // Fetch flag URL and additional country data from our secure proxy route
        try {
          const encodedName = encodeURIComponent(data.name)
          const response = await fetch(
            `/api/countries/details?name=${encodedName}`
          )
          if (response.ok) {
            const resJson = await response.json()
            const details = resJson.data?.objects?.[0] || resJson[0]
            if (details) {
              data.flagUrl = details.flag?.url_svg || details.flag?.url_png || details.flags?.svg || details.flags?.png
              data.capital = details.capitals?.[0]?.name || details.capital?.[0]
              data.population = details.population
              data.region = details.region
              data.subregion = details.subregion
              data.languages = Array.isArray(details.languages) 
                ? details.languages.map((l: any) => l.name) 
                : (details.languages ? Object.values(details.languages) : [])
              data.area = details.area?.kilometers || details.area
              data.maps = details.links?.google_maps || details.maps?.googleMaps
            }
          }
        } catch (fetchError) {
          console.error(`Error fetching extra details for ${data.name}:`, fetchError)
        }
      }
      return data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache validity
    gcTime: 1000 * 60 * 10, // 10 minutes cache garbage collection
  })

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !country) {
    notFound()
  }

  // Group banknotes by currency
  const banknotesByCurrency = country.currencycountry.reduce((acc: any, currencyCountry: any) => {
    if (currencyCountry.currencies.banknotes && currencyCountry.currencies.banknotes.length > 0) {
      const currencyCode = currencyCountry.currencies.code
      acc[currencyCode] = acc[currencyCode] || []
      acc[currencyCode].push(...currencyCountry.currencies.banknotes)
    }
    return acc
  }, {})

  // Count total banknotes
  const totalBanknotes = Object.values(banknotesByCurrency).reduce((sum: number, notes: any[]) => sum + notes.length, 0)

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/countries"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Countries
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {country.flagUrl && (
          <div className="w-full md:w-1/3 lg:w-1/4">
            <div className="overflow-hidden rounded-lg border shadow-sm">
              <img
                src={country.flagUrl || "/placeholder.svg"}
                alt={`Flag of ${country.name}`}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        )}

        <div className="flex-1 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{country.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-sm font-medium">
                  {country.code}
                </Badge>
                {country.region && (
                  <Badge variant="secondary" className="text-sm font-medium">
                    {country.region}
                  </Badge>
                )}
              </div>
            </div>
            <Link href={`/countries/${params.id}/edit`}>
              <Button variant="outline" size="sm" className="h-9">
                <Edit className="mr-2 h-4 w-4" />
                Edit Country
              </Button>
            </Link>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                  Currencies
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <p className="text-2xl font-bold">{country.currencycountry.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Banknote className="mr-2 h-4 w-4 text-muted-foreground" />
                  Banknotes
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <p className="text-2xl font-bold">{totalBanknotes}</p>
              </CardContent>
            </Card>

            {country.population && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    Population
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  <p className="text-2xl font-bold">{country.population.toLocaleString()}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="banknotes">Banknotes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="mr-2 h-5 w-5" />
                Country Information
              </CardTitle>
              <CardDescription>Details about {country.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {country.capital && (
                  <div className="flex items-start">
                    <MapPin className="mr-2 h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Capital</p>
                      <p className="text-muted-foreground">{country.capital}</p>
                    </div>
                  </div>
                )}

                {country.region && (
                  <div className="flex items-start">
                    <Globe className="mr-2 h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Region</p>
                      <p className="text-muted-foreground">
                        {country.region}
                        {country.subregion && ` (${country.subregion})`}
                      </p>
                    </div>
                  </div>
                )}

                {country.area && (
                  <div className="flex items-start">
                    <MapPin className="mr-2 h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Area</p>
                      <p className="text-muted-foreground">{country.area.toLocaleString()} km²</p>
                    </div>
                  </div>
                )}

                {country.languages && country.languages.length > 0 && (
                  <div className="flex items-start">
                    <Globe className="mr-2 h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Languages</p>
                      <p className="text-muted-foreground">{country.languages.join(", ")}</p>
                    </div>
                  </div>
                )}
              </div>

              {country.maps && (
                <div className="pt-2">
                  <a
                    href={country.maps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="mr-1 h-4 w-4" />
                    View on Google Maps
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currencies Tab */}
        <TabsContent value="currencies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Landmark className="mr-2 h-5 w-5" />
                Currencies Used in {country.name}
              </CardTitle>
              <CardDescription>All currencies associated with this country</CardDescription>
            </CardHeader>
            <CardContent>
              {country.currencycountry.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {country.currencycountry.map((currency: any) => (
                    <Card key={currency.currencyid} className="overflow-hidden border shadow-sm">
                      <CardHeader className="p-4 pb-2 bg-muted/50">
                        <CardTitle className="text-lg font-semibold">{currency.currencies.code}</CardTitle>
                        <CardDescription>{currency.currencies.name}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-3">
                        <div className="text-sm">
                          <p className="flex justify-between py-1">
                            <span className="text-muted-foreground">Symbol:</span>
                            <span className="font-medium">{currency.currencies.symbol || "—"}</span>
                          </p>
                          <p className="flex justify-between py-1">
                            <span className="text-muted-foreground">Banknotes:</span>
                            <span className="font-medium">{currency.currencies.banknotes?.length || 0}</span>
                          </p>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-end">
                        <Link href={`/currencies/${currency.currencyid}`}>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No currencies associated with this country.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banknotes Tab */}
        <TabsContent value="banknotes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Banknote className="mr-2 h-5 w-5" />
                Banknotes from {country.name}
              </CardTitle>
              <CardDescription>Banknotes in your collection from this country</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(banknotesByCurrency).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(banknotesByCurrency).map(([currencyCode, banknotes]: [string, any]) => (
                    <div key={currencyCode}>
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                        {currencyCode}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {banknotes.map((banknote: any) => (
                          <BanknoteCard key={banknote.banknoteid} banknote={banknote} />
                        ))}
                      </div>
                      <Separator className="my-6" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No banknotes from this country in your collection.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
