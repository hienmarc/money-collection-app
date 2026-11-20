"use client"

import { Calendar, DollarSign, Globe, Info, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export interface NumistaBanknote {
  id?: number | string
  title?: string
  obverse_thumbnail?: string
  reverse_thumbnail?: string
  issuer?: { name?: string }
  min_year?: number
  max_year?: number
  value?: { text?: string }
}

export function NumistaBanknoteCard({
  banknote,
  onAddToCollection,
  showReverseThumbnail = false,
}: {
  banknote: NumistaBanknote
  onAddToCollection: () => void
  showReverseThumbnail?: boolean
}) {
  const obverseImage = banknote.obverse_thumbnail ? (
    <img
      src={banknote.obverse_thumbnail}
      alt={`${banknote.title || "Banknote"} (obverse)`}
      className="h-full w-full object-contain"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
      <Info className="h-5 w-5" />
    </div>
  )

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className={showReverseThumbnail ? "flex flex-col" : "flex"}>
          {showReverseThumbnail ? (
            <div className="flex h-24 w-full flex-shrink-0 bg-gray-100">
              <div className="w-1/2 border-r border-background">{obverseImage}</div>
              <div className="w-1/2">
                {banknote.reverse_thumbnail ? (
                  <img
                    src={banknote.reverse_thumbnail}
                    alt={`${banknote.title || "Banknote"} (reverse)`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Info className="h-5 w-5" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-24 w-[45%] flex-shrink-0 bg-gray-100">{obverseImage}</div>
          )}
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
            <Button
              onClick={onAddToCollection}
              size="icon"
              className="absolute bottom-2 right-2 h-6 w-6 rounded-full"
              title="Add to Collection"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
