"use client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Plus, Calendar, DollarSign, Globe, Info, CheckCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function BanknoteAddSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const numistaId = searchParams.get("numista_id")
  const returnUrl = searchParams.get("return_url") || "/banknotes"

  const [relatedBanknotes, setRelatedBanknotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (numistaId) {
      fetchRelatedBanknotes()
    } else {
      // If no numista ID, redirect back immediately
      setTimeout(() => router.push(returnUrl), 2000)
    }
  }, [numistaId, returnUrl, router])

  const fetchRelatedBanknotes = async () => {
    if (!numistaId) return

    try {
      setIsLoading(true)
      const baseId = Number.parseInt(numistaId)
      const relatedIds = [baseId - 2, baseId - 1, baseId, baseId + 1, baseId + 2]

      // Fetch data for each related ID
      const promises = relatedIds.map(async (id) => {
        try {
          const response = await fetch(`/api/numista/types/${id}`)
          if (response.ok) {
            const data = await response.json()
            return { ...data, id }
          }
          return null
        } catch (error) {
          console.error(`Error fetching banknote ${id}:`, error)
          return null
        }
      })

      const results = await Promise.all(promises)
      const validResults = results.filter((result) => result !== null)
      setRelatedBanknotes(validResults)
    } catch (error) {
      console.error("Error fetching related banknotes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCollection = (banknote) => {
    router.push(`/banknotes/new?numista_id=${banknote.id}&return_url=${encodeURIComponent(returnUrl)}`)
  }

  const handleSkip = () => {
    router.push(returnUrl)
  }

  return (
    <div className="container max-w-4xl mx-auto px-4">
      {/* Success Header */}
      <div className="text-center mb-2">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-green-600">Banknote Added Successfully!</h1>
        <p className="text-muted-foreground">
          Would you like to add similar banknotes to speed up your collection process?
        </p>
      </div>

      {/* Related Banknotes Section */}
      {numistaId && (
        <div className="space-y-2">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Related Banknotes</h2>
            <p className="text-sm text-muted-foreground">
              Similar banknotes from the catalog (Numista IDs around {numistaId})
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col">
                      <div className="h-32 bg-muted">
                        <Skeleton className="h-full w-full" />
                      </div>
                      <div className="p-3">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : relatedBanknotes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {relatedBanknotes.map((banknote) => (
                <Card
                  key={banknote.id}
                  className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                    banknote.id.toString() === numistaId ? "ring-2 ring-green-500 bg-green-50" : ""
                  }`}
                  onClick={() => handleAddToCollection(banknote)}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col">
                      <div className="h-32 bg-gray-100 flex-shrink-0 relative">
                        {banknote.obverse?.thumbnail ? (
                          <img
                            src={banknote.obverse?.thumbnail || "/placeholder.svg"}
                            alt={`${banknote.title} (obverse)`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Info className="h-8 w-8" />
                          </div>
                        )}
                        {banknote.id.toString() === numistaId && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            Just Added
                          </div>
                        )}
                        {banknote.id.toString() !== numistaId && (
                          <Button
                            size="icon"
                            className="h-8 w-8 rounded-full absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Add to Collection"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddToCollection(banknote)
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="p-3 flex-1">
                        <div>
                          <h3 className="font-medium text-sm mb-1 line-clamp-2">{banknote.title}</h3>
                          <div className="space-y-1">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Globe className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="line-clamp-1">{banknote.issuer?.name || "Unknown"}</span>
                            </div>
                            {(banknote.min_year || banknote.max_year) && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span>
                                  {banknote.min_year === banknote.max_year
                                    ? banknote.min_year
                                    : `${banknote.min_year}-${banknote.max_year}`}
                                </span>
                              </div>
                            )}
                            {banknote.value?.text && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <DollarSign className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="line-clamp-1">{banknote.value.text}</span>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">ID: {banknote.id}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border rounded-lg bg-muted/20">
              <p className="text-muted-foreground">No related banknotes found in the catalog.</p>
              <Button onClick={handleSkip} className="mt-4">
                Continue to Collection
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Bottom Action */}
      <div className="flex justify-center mt-8">
        <Button onClick={handleSkip} size="lg">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Collection
        </Button>
      </div>
    </div>
  )
}
