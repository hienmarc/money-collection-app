"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Heart, Loader2, Lock, Star, Trash2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useWishlist } from "@/hooks/use-wishlist"
import type { WishlistItem, UserProfile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

function WishlistItemCard({
  item,
  canManage,
  onUpdateLevel,
  onRemove,
  isUpdating,
  isRemoving,
}: {
  item: WishlistItem
  canManage: boolean
  onUpdateLevel: (level: number) => void
  onRemove: () => void
  isUpdating: boolean
  isRemoving: boolean
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState(item.level)
  const years = item.min_year === item.max_year
    ? item.min_year
    : [item.min_year, item.max_year].filter((year) => year !== null).join("-")

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          <div className="h-28 w-[38%] flex-shrink-0 bg-muted">
            {item.obverse_thumbnail ? (
              <img
                src={item.obverse_thumbnail}
                alt={`${item.title} (obverse)`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Heart className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
            <div className="min-w-0">
              <CardTitle className="line-clamp-2 text-sm">{item.title}</CardTitle>
              <p className="mt-1 truncate text-xs text-muted-foreground">{item.country}</p>
              {years && <p className="mt-1 text-xs text-muted-foreground">{years}</p>}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex" aria-label={`Wishlist priority: ${item.level} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <Star
                    key={level}
                    className={`h-3.5 w-3.5 ${
                      level <= item.level ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <Popover
                    open={isPickerOpen}
                    onOpenChange={(open) => {
                      if (open) setSelectedLevel(item.level)
                      setIsPickerOpen(open)
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        aria-label="Change wishlist priority"
                      >
                        Edit
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="w-56 space-y-3">
                      <p className="text-sm font-medium">Wishlist priority</p>
                      <div className="flex items-center justify-center">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <Button
                            key={level}
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
                        size="sm"
                        className="w-full"
                        disabled={isUpdating}
                        onClick={() => {
                          onUpdateLevel(selectedLevel)
                          setIsPickerOpen(false)
                        }}
                      >
                        Save priority
                      </Button>
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    title="Remove from wishlist"
                    aria-label="Remove from wishlist"
                    disabled={isRemoving}
                    onClick={onRemove}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function WishlistPageContent({ userId }: { userId?: string }) {
  const supabase = createClient()
  const wishlist = useWishlist(userId)
  const targetUserId = userId ?? wishlist.currentUser?.id

  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError,
  } = useQuery({
    queryKey: ["wishlistProfile", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_public, created_at, updated_at")
        .eq("id", targetUserId)
        .maybeSingle()

      if (error) throw error
      return data as UserProfile | null
    },
    enabled: !!targetUserId,
  })

  const isOwnWishlist = wishlist.isOwnWishlist
  const isPrivate = !!targetUserId && !isOwnWishlist && (!profile || !profile.is_public)

  if (wishlist.isLoadingCurrentUser || isLoadingProfile || wishlist.isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading wishlist...</p>
      </div>
    )
  }

  if (!targetUserId) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <CardTitle>Sign in to view your wishlist</CardTitle>
        <CardDescription className="mt-2">Your saved banknotes will appear here.</CardDescription>
        <Button asChild className="mt-5">
          <Link href="/login">Sign in</Link>
        </Button>
      </Card>
    )
  }

  if (profileError || wishlist.error || wishlist.currentUserError) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <CardTitle>Could not load this wishlist</CardTitle>
        <CardDescription className="mt-2">Please try again later.</CardDescription>
      </Card>
    )
  }

  if (isPrivate) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href={`/users/${targetUserId}`}>
            <ArrowLeft className="h-4 w-4" /> Back to profile
          </Link>
        </Button>
        <Card className="flex flex-col items-center p-12 text-center">
          <Lock className="mb-4 h-10 w-10 text-muted-foreground" />
          <CardTitle>This Wishlist is Private</CardTitle>
          <CardDescription className="mt-2">
            This collector has set their profile to private.
          </CardDescription>
        </Card>
      </div>
    )
  }

  const displayName = isOwnWishlist ? "My Wishlist" : `${profile?.full_name || "Collector"}'s Wishlist`

  return (
    <div className="space-y-5">
      {!isOwnWishlist && (
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href={`/users/${targetUserId}`}>
            <ArrowLeft className="h-4 w-4" /> Back to profile
          </Link>
        </Button>
      )}
      <div>
        <h1 className="text-2xl font-bold">{displayName}</h1>
        <p className="text-sm text-muted-foreground">
          {wishlist.items.length} {wishlist.items.length === 1 ? "banknote" : "banknotes"}
        </p>
      </div>

      {wishlist.items.length === 0 ? (
        <Card className="flex flex-col items-center p-10 text-center">
          <Heart className="mb-3 h-10 w-10 text-muted-foreground" />
          <CardTitle className="text-lg">No banknotes on this wishlist</CardTitle>
          <CardDescription className="mt-2">
            {isOwnWishlist ? "Add banknotes from the catalog to keep track of what you want." : "This wishlist is empty."}
          </CardDescription>
          {isOwnWishlist && (
            <Button asChild className="mt-4" size="sm">
              <Link href="/catalog">Browse catalog</Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {wishlist.items.map((item) => (
            <WishlistItemCard
              key={item.wishlistid}
              item={item}
              canManage={isOwnWishlist}
              onUpdateLevel={(level) => wishlist.updateLevel.mutate({ wishlistId: item.wishlistid, level })}
              onRemove={() => wishlist.remove.mutate(item.wishlistid)}
              isUpdating={wishlist.updateLevel.isPending}
              isRemoving={wishlist.remove.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
