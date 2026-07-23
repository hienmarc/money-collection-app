"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiSelect } from "@/components/ui/multi-select"
import { createClient } from "@/utils/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { Coins, Globe, CreditCard, Banknote, Database, Loader2, Search, Plus, Check, X, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AvailableCurrency {
  code: string
  name: string
  symbol: string
  countries: string[]
}

interface ApiResponse {
  available: AvailableCurrency[]
  existing: number
  total: number
}

export default function NewCurrencyPage() {
  const supabase = createClient()
  const router = useRouter()
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [symbol, setSymbol] = useState("")
  const [subunit, setSubunit] = useState("")
  const [numistaid, setNumistaId] = useState<string>("")
  const [countries, setCountries] = useState<string[]>([])
  const [availableCountries, setAvailableCountries] = useState<{ value: string; label: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingCountries, setIsFetchingCountries] = useState(true)

  // New states for currency selection
  const [availableCurrencies, setAvailableCurrencies] = useState<AvailableCurrency[]>([])
  const [filteredCurrencies, setFilteredCurrencies] = useState<AvailableCurrency[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCurrency, setSelectedCurrency] = useState<AvailableCurrency | null>(null)
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true)
  const [showManualForm, setShowManualForm] = useState(false)

  useEffect(() => {
    fetchCountries()
    fetchAvailableCurrencies()
  }, [])

  useEffect(() => {
    // Filter currencies based on search query
    if (searchQuery.trim() === "") {
      setFilteredCurrencies(availableCurrencies)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredCurrencies(
        availableCurrencies.filter(
          (currency) =>
            currency.name.toLowerCase().includes(query) ||
            currency.code.toLowerCase().includes(query) ||
            currency.countries.some((country) => country.toLowerCase().includes(query)),
        ),
      )
    }
  }, [searchQuery, availableCurrencies])

  async function fetchCountries() {
    setIsFetchingCountries(true)
    try {
      const { data, error } = await supabase.from("countries").select("countryid, name")
      if (error) {
        console.error("Error fetching countries:", error)
        toast({
          title: "Error",
          description: "Failed to load countries. Please refresh the page.",
          variant: "destructive",
        })
      } else {
        setAvailableCountries(
          data.map((country) => ({
            value: country.countryid.toString(),
            label: country.name,
          })),
        )
      }
    } catch (error) {
      console.error("Error fetching countries:", error)
    } finally {
      setIsFetchingCountries(false)
    }
  }

  async function fetchAvailableCurrencies() {
    setIsLoadingCurrencies(true)
    try {
      const response = await fetch("/api/currencies/available")
      const data: ApiResponse = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setAvailableCurrencies(data.available)
      setFilteredCurrencies(data.available)

      toast({
        title: "Currencies Loaded",
        description: `Found ${data.available.length} new currencies available to add (${data.existing} already in database).`,
      })
    } catch (error) {
      console.error("Error fetching available currencies:", error)
      toast({
        title: "Error",
        description: "Failed to load available currencies. You can still add currencies manually.",
        variant: "destructive",
      })
      setShowManualForm(true)
    } finally {
      setIsLoadingCurrencies(false)
    }
  }

  function selectCurrency(currency: AvailableCurrency) {
    setSelectedCurrency(currency)
    setName(currency.name)
    setCode(currency.code)
    setSymbol(currency.symbol)

    // Try to match countries
    const matchedCountries: string[] = []
    currency.countries.forEach((countryName) => {
      const match = availableCountries.find((ac) => ac.label.toLowerCase() === countryName.toLowerCase())
      if (match) {
        matchedCountries.push(match.value)
      }
    })
    setCountries(matchedCountries)

    // Clear search and show form
    setSearchQuery("")
    setShowManualForm(true)
  }

  function clearSelection() {
    setSelectedCurrency(null)
    setName("")
    setCode("")
    setSymbol("")
    setSubunit("")
    setNumistaId("")
    setCountries([])
    setShowManualForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!validateForm()) {
      setIsLoading(false)
      return
    }

    // Convert numistaid to number or null
    const numistaIdValue = numistaid.trim() === "" ? null : Number.parseInt(numistaid, 10)

    // Check if numistaid is a valid number when provided
    if (numistaid.trim() !== "" && isNaN(numistaIdValue as number)) {
      toast({
        title: "Validation Error",
        description: "Numista ID must be a valid number.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("currencies")
        .insert({
          name,
          code,
          symbol,
          subunit,
          numistaid: numistaIdValue,
        })
        .select()

      if (error) {
        console.error("Error adding currency:", error)
        toast({
          title: "Error",
          description: "Failed to add currency. Please try again.",
          variant: "destructive",
        })
        return
      }

      const currencyId = data[0].currencyid

      if (countries.length > 0) {
        // Associate countries with the new currency
        const countryAssociations = countries.map((countryId) => ({
          currencyid: currencyId,
          countryid: Number.parseInt(countryId),
          iscurrent: true, // Assuming all associations are current
        }))

        const { error: associationError } = await supabase.from("currencycountry").insert(countryAssociations)

        if (associationError) {
          console.error("Error associating countries with currency:", associationError)
          toast({
            title: "Warning",
            description: "Currency added, but there was an error associating countries.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Success",
            description: "Currency added successfully with country associations.",
          })
        }
      } else {
        toast({
          title: "Success",
          description: "Currency added successfully.",
        })
      }

      router.push("/currencies")
      router.refresh()
    } catch (error) {
      console.error("Error in currency creation process:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = () => {
    if (!name || !code) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name and Code).",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  return (
    <div className="container mx-auto py-4 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Add New Currency</h1>
        <Button variant="outline" onClick={() => router.back()} size="sm">
          Cancel
        </Button>
      </div>

      {/* Currency Selection Section */}
      {!showManualForm && (
        <Card className="w-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Select Currency from Global Database
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose from {availableCurrencies.length} available currencies not yet in your database
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchAvailableCurrencies} disabled={isLoadingCurrencies}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCurrencies ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowManualForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manually
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search currencies by name, code, or country..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Loading State */}
            {isLoadingCurrencies && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading available currencies...</span>
              </div>
            )}

            {/* Currency List */}
            {!isLoadingCurrencies && (
              <ScrollArea className="h-[400px] w-full border rounded-md">
                <div className="p-4 space-y-2">
                  {filteredCurrencies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No currencies match your search." : "No new currencies available."}
                    </div>
                  ) : (
                    filteredCurrencies.map((currency) => (
                      <div
                        key={currency.code}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => selectCurrency(currency)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{currency.name}</span>
                            <Badge variant="secondary">{currency.code}</Badge>
                            {currency.symbol && <Badge variant="outline">{currency.symbol}</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Used in: {currency.countries.slice(0, 3).join(", ")}
                            {currency.countries.length > 3 && ` +${currency.countries.length - 3} more`}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Form Section */}
      {showManualForm && (
        <Card className="w-full">
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  {selectedCurrency ? "Review & Add Currency" : "Currency Details"}
                </CardTitle>
                {selectedCurrency && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Auto-filled from {selectedCurrency.code}
                    </Badge>
                    <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                )}
              </div>
              {selectedCurrency && (
                <p className="text-sm text-muted-foreground">
                  Data has been automatically populated. Review and modify as needed before adding.
                </p>
              )}
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="flex items-center gap-1.5 text-sm">
                    <Banknote className="h-3.5 w-3.5" />
                    Name *
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Euro"
                    required
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="code" className="flex items-center gap-1.5 text-sm">
                    <CreditCard className="h-3.5 w-3.5" />
                    Code *
                  </Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="EUR"
                    className="uppercase h-9"
                    maxLength={3}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="symbol" className="flex items-center gap-1.5 text-sm">
                    <Coins className="h-3.5 w-3.5" />
                    Symbol
                  </Label>
                  <Input
                    id="symbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="€"
                    maxLength={5}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subunit" className="flex items-center gap-1.5 text-sm">
                    <Coins className="h-3.5 w-3.5" />
                    Subunit
                  </Label>
                  <Input
                    id="subunit"
                    value={subunit}
                    onChange={(e) => setSubunit(e.target.value)}
                    placeholder="e.g. Cent"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="numistaid" className="flex items-center gap-1.5 text-sm">
                    <Database className="h-3.5 w-3.5" />
                    Numista ID
                  </Label>
                  <Input
                    id="numistaid"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numistaid}
                    onChange={(e) => {
                      // Allow empty string or numbers only
                      if (e.target.value === "" || /^\d+$/.test(e.target.value)) {
                        setNumistaId(e.target.value)
                      }
                    }}
                    placeholder="e.g. 12345 (optional)"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="countries" className="flex items-center gap-1.5 text-sm">
                    <Globe className="h-3.5 w-3.5" />
                    Countries
                  </Label>
                  {isFetchingCountries ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm h-9">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading countries...
                    </div>
                  ) : (
                    <MultiSelect
                      id="countries"
                      options={availableCountries}
                      selected={countries}
                      onChange={setCountries}
                      placeholder="Select countries..."
                      className="min-h-9"
                    />
                  )}
                </div>
              </div>

              {selectedCurrency && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-2">Source Information:</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Countries:</span>
                      <p>{selectedCurrency.countries.join(", ")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Matched Countries:</span>
                      <p>
                        {countries.length} of {selectedCurrency.countries.length} matched in database
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-between pt-2 pb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowManualForm(false)}
                disabled={isLoading}
              >
                Back to Selection
              </Button>
              <Button type="submit" disabled={isLoading} size="sm">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Currency"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  )
}
