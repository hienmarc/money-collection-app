"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Search, Calendar, DollarSign, Globe, Info, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function CatalogPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeQuery, setActiveQuery] = useState("")
  const router = useRouter()

  const { data, isLoading, isError } = useQuery({
    queryKey: ["catalog", activeQuery],
    queryFn: async () => {
      if (!activeQuery) return { types: [] }
      const response = await fetch(`/api/numista?q=${encodeURIComponent(activeQuery)}`)
      if (!response.ok) throw new Error("Failed to fetch data")
      return response.json()
    },
    enabled: !!activeQuery,
  })

  const searchResults = data?.types || []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveQuery(searchQuery)
  }

  const handleAddToCollection = (banknote: any) => {
    router.push(`/banknotes/new?numista_id=${banknote.id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Banknote Catalog</h1>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search banknotes..."
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            "Search"
          )}
        </Button>
      </form>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex">
                  <div className="w-[45%] h-24 bg-muted">
                    <Skeleton className="h-full w-full" />
                  </div>
                  <div className="p-3 flex-1">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center p-6 border rounded-lg bg-destructive/10 text-destructive">
          <p>Failed to search banknotes. Please try again.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {searchResults.map((banknote: any) => (
            <Card key={banknote.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex">
                  <div className="w-[45%] h-24 bg-gray-100 flex-shrink-0">
                    {banknote.obverse_thumbnail ? (
                      <img
                        src={banknote.obverse_thumbnail || "/placeholder.svg"}
                        alt={`${banknote.title} (obverse)`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Info className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between relative">
                    <div>
                      <h3 className="font-medium text-sm mb-1 line-clamp-1">{banknote.title}</h3>
                      <div className="flex items-center text-xs text-muted-foreground mt-1 line-clamp-1">
                        <Globe className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span>{banknote.issuer?.name || "Unknown"}</span>
                      </div>
                      {(banknote.min_year || banknote.max_year) && (
                        <div className="flex items-center text-xs text-muted-foreground mt-1 line-clamp-1">
                          <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span>
                            {banknote.min_year === banknote.max_year
                              ? banknote.min_year
                              : `${banknote.min_year}-${banknote.max_year}`}
                          </span>
                        </div>
                      )}
                      {banknote.value?.text && (
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <DollarSign className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="line-clamp-1">{banknote.value.text}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleAddToCollection(banknote)}
                      size="icon"
                      className="h-6 w-6 rounded-full absolute bottom-2 right-2"
                      title="Add to Collection"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchResults.length === 0 && activeQuery && !isLoading && !isError && (
        <div className="text-center p-6 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">No banknotes found. Try a different search term.</p>
        </div>
      )}
    </div>
  )
}
