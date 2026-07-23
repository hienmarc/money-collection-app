"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/use-toast"
import { Search, Globe, Plus, Check, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

interface AvailableCountry {
  name: string
  officialName: string
  code: string
  code3: string
  flag: string
  flagUrl: string
  region: string
  subregion: string
}

export default function NewCountryPage() {
  const router = useRouter()
  const supabase = createClient()
  const [availableCountries, setAvailableCountries] = useState<AvailableCountry[]>([])
  const [filteredCountries, setFilteredCountries] = useState<AvailableCountry[]>([])
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string>("all")

  useEffect(() => {
    fetchAvailableCountries()
  }, [])

  useEffect(() => {
    filterCountries()
  }, [searchTerm, selectedRegion, availableCountries])

  const fetchAvailableCountries = async () => {
    try {
      const response = await fetch("/api/countries/available")
      if (!response.ok) {
        throw new Error("Failed to fetch available countries")
      }
      const countries = await response.json()
      setAvailableCountries(countries)
      setFilteredCountries(countries)
    } catch (error) {
      console.error("Error fetching countries:", error)
      toast({
        title: "Error",
        description: "Failed to fetch available countries. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterCountries = () => {
    let filtered = availableCountries

    if (searchTerm) {
      filtered = filtered.filter(
        (country) =>
          country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          country.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          country.region.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedRegion !== "all") {
      filtered = filtered.filter((country) => country.region === selectedRegion)
    }

    setFilteredCountries(filtered)
  }

  const toggleCountrySelection = (countryCode: string) => {
    const newSelected = new Set(selectedCountries)
    if (newSelected.has(countryCode)) {
      newSelected.delete(countryCode)
    } else {
      newSelected.add(countryCode)
    }
    setSelectedCountries(newSelected)
  }

  const selectAllVisible = () => {
    const newSelected = new Set(selectedCountries)
    filteredCountries.forEach((country) => {
      newSelected.add(country.code)
    })
    setSelectedCountries(newSelected)
  }

  const clearSelection = () => {
    setSelectedCountries(new Set())
  }

  const handleAddCountries = async () => {
    if (selectedCountries.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one country to add.",
        variant: "destructive",
      })
      return
    }

    setIsAdding(true)

    try {
      const countriesToAdd = availableCountries
        .filter((country) => selectedCountries.has(country.code))
        .map((country) => ({
          name: country.name,
          code: country.code,
        }))

      const { error } = await supabase.from("countries").insert(countriesToAdd)

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: `Successfully added ${countriesToAdd.length} ${countriesToAdd.length === 1 ? "country" : "countries"}.`,
      })

      router.push("/countries")
      router.refresh()
    } catch (error) {
      console.error("Error adding countries:", error)
      toast({
        title: "Error",
        description: "Failed to add countries. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  const regions = [...new Set(availableCountries.map((country) => country.region))].sort()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading available countries...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Add New Countries</h1>
          <p className="text-muted-foreground mt-1">Select countries from the list below to add to your database</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {availableCountries.length} countries available
        </Badge>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Countries</Label>
              <Input
                id="search"
                placeholder="Search by name, code, or region..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="sm:w-48">
              <Label htmlFor="region">Filter by Region</Label>
              <select
                id="region"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="all">All Regions</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={selectAllVisible} disabled={filteredCountries.length === 0}>
                <Check className="h-4 w-4 mr-1" />
                Select All Visible ({filteredCountries.length})
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection} disabled={selectedCountries.size === 0}>
                Clear Selection
              </Button>
            </div>
            <Badge variant={selectedCountries.size > 0 ? "default" : "secondary"}>
              {selectedCountries.size} selected
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Countries List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Available Countries</span>
          </CardTitle>
          <CardDescription>{filteredCountries.length} countries shown</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCountries.map((country) => (
                <div
                  key={country.code}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedCountries.has(country.code) ? "bg-primary/10 border-primary" : "border-border"
                  }`}
                  onClick={() => toggleCountrySelection(country.code)}
                >
                  <Checkbox
                    checked={selectedCountries.has(country.code)}
                    onChange={() => toggleCountrySelection(country.code)}
                  />
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-2xl" title={country.flag}>
                      {country.flag}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{country.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {country.code}
                        </Badge>
                        <span className="truncate">{country.region}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredCountries.length === 0 && (
              <div className="text-center py-12">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No countries found</h3>
                <p className="text-muted-foreground">Try adjusting your search terms or filters</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/countries")}>
          Cancel
        </Button>
        <Button
          onClick={handleAddCountries}
          disabled={selectedCountries.size === 0 || isAdding}
          className="min-w-[120px]"
        >
          {isAdding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add {selectedCountries.size > 0 ? `${selectedCountries.size} ` : ""}Countries
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
