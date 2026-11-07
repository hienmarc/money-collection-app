"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Heart, Loader2, Lock, Plus, Star, Trash2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useWishlist } from "@/hooks/use-wishlist"
import { useExchangeRates } from "@/hooks/use-currencies"
import type { WishlistItem, UserProfile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

function WishlistItemCard({
  item,
  canManage,
  onUpdateLevel,
  onRemove,
  isUpdating,
  isRemoving,
  referenceCurrency,
  exchangeRates,
}: {
  item: WishlistItem
  canManage: boolean
  onUpdateLevel: (level: number) => void
  onRemove: () => void
  isUpdating: boolean
  isRemoving: boolean
  referenceCurrency: string
  exchangeRates: Record<string, number>
}) {
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null)
  const years = item.min_year === item.max_year
    ? item.min_year
    : [item.min_year, item.max_year].filter((year) => year !== null).join("-")
  const amount = item.value_amount === null ? null : Number(item.value_amount)
  const sourceRate = item.value_currency === "EUR" ? 1 : exchangeRates[item.value_currency || ""]
  const targetRate = referenceCurrency === "EUR" ? 1 : exchangeRates[referenceCurrency]
  const estimatedValue =
    amount !== null && Number.isFinite(amount) && sourceRate && targetRate
      ? (amount / sourceRate) * targetRate
      : null
  const levelPreview = hoveredLevel ?? item.level

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="h-28 w-[38%] flex-shrink-0 cursor-zoom-in bg-muted"
                aria-label={`View ${item.title} image full screen`}
                disabled={!item.obverse_thumbnail}
              >
                {item.obverse_thumbnail ? (
                  <img
                    src={item.obverse_thumbnail}
                    alt={`${item.title} (obverse)`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center">
                    <Heart className="h-5 w-5 text-muted-foreground" />
                  </span>
                )}
              </button>
            </DialogTrigger>
            {item.obverse_thumbnail && (
              <DialogContent className="flex h-[96vh] w-[96vw] max-w-none items-center justify-center border-0 bg-black/95 p-4">
                <img
                  src={item.obverse_thumbnail}
                  alt={`${item.title} (obverse)`}
                  className="max-h-full max-w-full object-contain"
                />
              </DialogContent>
            )}
          </Dialog>
          <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
            <div className="min-w-0">
              <CardTitle className="line-clamp-2 text-sm">{item.title}</CardTitle>
              <p className="mt-1 truncate text-xs text-muted-foreground">{item.country}</p>
              {years && <p className="mt-1 text-xs text-muted-foreground">{years}</p>}
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Estimated value:{" "}
                {estimatedValue === null
                  ? item.value_text
                    ? `${item.value_text} (conversion unavailable)`
                    : "Unavailable"
                  : new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: referenceCurrency,
                      maximumFractionDigits: 2,
                    }).format(estimatedValue)}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div
                className="flex"
                aria-label={`Wishlist priority: ${item.level} out of 5 stars`}
                onMouseLeave={() => setHoveredLevel(null)}
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  canManage ? (
                    <button
                      key={level}
                      type="button"
                      className="rounded-sm p-0.5 disabled:cursor-not-allowed"
                      aria-label={`Set wishlist level to ${level} ${level === 1 ? "star" : "stars"}`}
                      title={`${level} ${level === 1 ? "star" : "stars"}`}
                      disabled={isUpdating}
                      onMouseEnter={() => setHoveredLevel(level)}
                      onFocus={() => setHoveredLevel(level)}
                      onBlur={() => setHoveredLevel(null)}
                      onClick={() => onUpdateLevel(level)}
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${
                          level <= levelPreview ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ) : (
                    <Star
                      key={level}
                      className={`h-3.5 w-3.5 ${
                        level <= item.level ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                      }`}
                    />
                  )
                ))}
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
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
              <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                <Link
                  href={`/banknotes/new?numista_id=${item.numistaid}`}
                  aria-label={`Add ${item.title} to collection`}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add to collection
                </Link>
              </Button>
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
  const { data: exchangeRates = {}, isLoading: isLoadingRates } = useExchangeRates()
  const targetUserId = userId ?? wishlist.currentUser?.id
  const [groupBy, setGroupBy] = useState<"level" | "country" | "none">("level")
  const [referenceCurrency, setReferenceCurrency] = useState("CAD")

  const groupedItems = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "", items: wishlist.items }]

    const groups = new Map<string, WishlistItem[]>()
    for (const item of wishlist.items) {
      const key = groupBy === "level" ? String(item.level) : item.country || "Unknown"
      groups.set(key, [...(groups.get(key) || []), item])
    }

    return [...groups.entries()]
      .sort(([first], [second]) =>
        groupBy === "level"
          ? Number(second) - Number(first)
          : first.localeCompare(second, undefined, { sensitivity: "base" }),
      )
      .map(([key, items]) => ({
        key,
        label: groupBy === "level" ? `${key} ${Number(key) === 1 ? "star" : "stars"}` : key,
        items,
      }))
  }, [groupBy, wishlist.items])

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

      {wishlist.items.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <label htmlFor="wishlist-grouping" className="text-sm font-medium">Group banknotes by</label>
            <Select
              value={groupBy}
              onValueChange={(value) => {
                if (value === "level" || value === "country" || value === "none") setGroupBy(value)
              }}
            >
              <SelectTrigger id="wishlist-grouping" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="level">Wishlist level</SelectItem>
                <SelectItem value="country">Country</SelectItem>
                <SelectItem value="none">No grouping</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label htmlFor="wishlist-currency" className="text-sm font-medium">Reference currency</label>
            <Select value={referenceCurrency} onValueChange={setReferenceCurrency}>
              <SelectTrigger id="wishlist-currency" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...new Set(["CAD", "USD", "EUR", ...Object.keys(exchangeRates)])]
                  .sort((a, b) => {
                    const common = ["CAD", "USD", "EUR"]
                    const firstIndex = common.indexOf(a)
                    const secondIndex = common.indexOf(b)
                    if (firstIndex !== -1 || secondIndex !== -1) {
                      return (firstIndex === -1 ? common.length : firstIndex) -
                        (secondIndex === -1 ? common.length : secondIndex)
                    }
                    return a.localeCompare(b)
                  })
                  .map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}
              </SelectContent>
            </Select>
            {isLoadingRates && <p className="text-xs text-muted-foreground">Loading exchange rates...</p>}
          </div>
        </div>
      )}

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
        <div className="space-y-6">
          {groupedItems.map((group) => (
            <section key={group.key} className="space-y-3">
              {group.label && <h2 className="text-lg font-semibold">{group.label}</h2>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => (
                  <WishlistItemCard
                    key={item.wishlistid}
                    item={item}
                    canManage={isOwnWishlist}
                    onUpdateLevel={(level) => wishlist.updateLevel.mutate({ wishlistId: item.wishlistid, level })}
                    onRemove={() => wishlist.remove.mutate(item.wishlistid)}
                    isUpdating={wishlist.updateLevel.isPending}
                    isRemoving={wishlist.remove.isPending}
                    referenceCurrency={referenceCurrency}
                    exchangeRates={exchangeRates}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
