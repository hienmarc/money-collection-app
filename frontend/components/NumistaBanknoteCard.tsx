"use client"

import { useState } from "react"
import { Calendar, DollarSign, Globe, Heart, Info, Plus, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface NumistaBanknote {
  id?: number | string
  title?: string
  obverse_thumbnail?: string
  issuer?: { name?: string }
  min_year?: number
  max_year?: number
  value?: { text?: string }
}

export function NumistaBanknoteCard({
  banknote,
  onAddToCollection,
  onAddToWishlist,
  wishlistLevel,
  isAddingToWishlist,
}: {
  banknote: NumistaBanknote
  onAddToCollection: () => void
  onAddToWishlist?: (level: number) => void
  wishlistLevel?: number
  isAddingToWishlist?: boolean
}) {
  const [isWishlistPickerOpen, setIsWishlistPickerOpen] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState(wishlistLevel ?? 3)

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex">
          <div className="h-24 w-[45%] flex-shrink-0 bg-gray-100">
            {banknote.obverse_thumbnail ? (
              <img
                src={banknote.obverse_thumbnail || "/placeholder.svg"}
                alt={`${banknote.title} (obverse)`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Info className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="relative flex flex-1 flex-col justify-between p-3">
            <div>
              <h3 className="mb-1 line-clamp-1 text-sm font-medium">{banknote.title}</h3>
              <div className="mt-1 flex items-center text-xs text-muted-foreground">
                <Globe className="mr-1 h-3 w-3 flex-shrink-0" />
                <span className="line-clamp-1">{banknote.issuer?.name || "Unknown"}</span>
              </div>
              {(banknote.min_year || banknote.max_year) && (
                <div className="mt-1 flex items-center text-xs text-muted-foreground">
                  <Calendar className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="line-clamp-1">
                    {banknote.min_year === banknote.max_year
                      ? banknote.min_year
                      : `${banknote.min_year}-${banknote.max_year}`}
                  </span>
                </div>
              )}
              {banknote.value?.text && (
                <div className="mt-1 flex items-center text-xs text-muted-foreground">
                  <DollarSign className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="line-clamp-1">{banknote.value.text}</span>
                </div>
              )}
            </div>
            <div className="absolute bottom-2 right-2 flex gap-1">
              {onAddToWishlist && (
                <Popover
                  open={isWishlistPickerOpen}
                  onOpenChange={(open) => {
                    if (open) setSelectedLevel(wishlistLevel ?? 3)
                    setIsWishlistPickerOpen(open)
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-6 w-6 rounded-full"
                      title={wishlistLevel ? "Update wishlist priority" : "Add to wishlist"}
                      aria-label={wishlistLevel ? "Update wishlist priority" : "Add to wishlist"}
                    >
                      <Heart className={`h-3 w-3 ${wishlistLevel ? "fill-current text-rose-500" : ""}`} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" className="w-56 space-y-3">
                    <p className="text-sm font-medium">How much do you want this banknote?</p>
                    <div className="flex items-center justify-center">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <Button
                          key={level}
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={`${level} ${level === 1 ? "star" : "stars"}`}
                          aria-label={`Set wishlist level to ${level} ${level === 1 ? "star" : "stars"}`}
                          aria-pressed={selectedLevel === level}
                          onClick={() => setSelectedLevel(level)}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              level <= selectedLevel ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                            }`}
                          />
                        </Button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      className="w-full"
                      size="sm"
                      disabled={isAddingToWishlist}
                      onClick={() => {
                        onAddToWishlist(selectedLevel)
                        setIsWishlistPickerOpen(false)
                      }}
                    >
                      {isAddingToWishlist ? "Saving..." : wishlistLevel ? "Update Wishlist" : "Add to Wishlist"}
                    </Button>
                  </PopoverContent>
                </Popover>
              )}
              <Button
                onClick={onAddToCollection}
                size="icon"
                className="h-6 w-6 rounded-full"
                title="Add to Collection"
                aria-label="Add to collection"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
