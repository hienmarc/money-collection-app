"use client"

import { use } from "react"
import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Banknote as BanknoteIcon,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  Loader2,
  Shield,
  CreditCard,
  Search,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import BanknoteCard from "@/components/BanknoteCard"
import { useUserProfile, useUpdateProfilePrivacy } from "@/hooks/use-users"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Banknote, Currency } from "@/lib/types"

type ProfileGroupBy = "none" | "country" | "currency" | "grade" | "year"

type CurrencyWithCountries = Partial<Currency> & {
  currencycountry?: { countries?: { name?: string } | null }[]
}

function getBanknoteCountries(banknote: Banknote) {
  const currency = banknote.currencies as CurrencyWithCountries | undefined
  return currency?.currencycountry?.map((entry) => entry.countries?.name).filter((name): name is string => !!name) ?? []
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params)
  const {
    profile,
    banknotes,
    banknotesCount,
    countriesCount,
    isOwnProfile,
    isPrivate,
    isLoading,
  } = useUserProfile(userId)

  const updatePrivacy = useUpdateProfilePrivacy()
  const [searchQuery, setSearchQuery] = useState("")
  const [currencyFilter, setCurrencyFilter] = useState("all")
  const [countryFilter, setCountryFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [groupBy, setGroupBy] = useState<ProfileGroupBy>("none")

  const filterOptions = useMemo(() => {
    const currencies = new Map<string, string>()
    const countries = new Set<string>()
    const years = new Set<number>()

    for (const banknote of banknotes) {
      const currency = banknote.currencies
      if (currency?.currencyid !== undefined) {
        currencies.set(String(currency.currencyid), `${currency.code || ""} ${currency.name || ""}`.trim())
      }
      getBanknoteCountries(banknote).forEach((country) => countries.add(country))
      if (banknote.year) years.add(banknote.year)
    }

    return {
      currencies: [...currencies.entries()].sort((a, b) => a[1].localeCompare(b[1])),
      countries: [...countries].sort((a, b) => a.localeCompare(b)),
      years: [...years].sort((a, b) => b - a),
    }
  }, [banknotes])

  const filteredBanknotes = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()

    return banknotes.filter((banknote) => {
      const countries = getBanknoteCountries(banknote)
      const currency = banknote.currencies
      const matchesSearch = !query || [
        banknote.code,
        banknote.denomination,
        banknote.year,
        banknote.grade,
        banknote.material,
        currency?.name,
        currency?.code,
        ...countries,
      ].some((value) => String(value ?? "").toLocaleLowerCase().includes(query))

      return matchesSearch
        && (currencyFilter === "all" || String(currency?.currencyid) === currencyFilter)
        && (countryFilter === "all" || countries.includes(countryFilter))
        && (yearFilter === "all" || String(banknote.year) === yearFilter)
        && (gradeFilter === "all" || String(banknote.grade) === gradeFilter)
    })
  }, [banknotes, searchQuery, currencyFilter, countryFilter, yearFilter, gradeFilter])

  const groupedBanknotes = useMemo(() => {
    const groups = new Map<string, Banknote[]>()

    for (const banknote of filteredBanknotes) {
      const countries = getBanknoteCountries(banknote)
      const currency = banknote.currencies
      const key = groupBy === "country"
        ? countries.join(", ") || "Unknown country"
        : groupBy === "currency"
          ? currency?.code || currency?.name || "Unknown currency"
          : groupBy === "grade"
            ? String(banknote.grade || "Unknown grade")
            : groupBy === "year"
              ? String(banknote.year || "Unknown year")
              : "all"
      groups.set(key, [...(groups.get(key) || []), banknote])
    }

    const entries = [...groups.entries()]
    if (groupBy === "year") {
      entries.sort(([a], [b]) => Number(b) - Number(a))
    } else if (groupBy === "grade") {
      entries.sort(([a], [b]) => a.localeCompare(b))
    } else {
      entries.sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    }
    return entries
  }, [filteredBanknotes, groupBy])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading collector profile...</p>
      </div>
    )
  }

  // If the profile is private and the viewer is not the profile owner
  if (isPrivate) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link href="/users">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Collectors
          </Button>
        </Link>

        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">This Profile is Private</CardTitle>
          <CardDescription className="mt-2 max-w-md text-base">
            This collector has set their profile to private. Their collection details and banknotes are not visible to other users.
          </CardDescription>
          <Button asChild className="mt-6">
            <Link href="/users">Explore Public Collectors</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const displayName = profile?.full_name || (isOwnProfile ? "My Profile" : "Anonymous Collector")
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleTogglePrivacy = () => {
    if (!profile) return
    updatePrivacy.mutate({
      userId,
      isPublic: !profile.is_public,
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div>
        <Link href="/users">
          <Button variant="ghost" size="sm" className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to Collectors
          </Button>
        </Link>
      </div>

      {/* Profile Header Banner */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 shadow-sm">
                <AvatarImage src={profile?.avatar_url || ""} alt={displayName} />
                <AvatarFallback className="text-xl font-bold">{initials || "U"}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
                  {isOwnProfile && (
                    <Badge variant="outline" className="text-xs">
                      You
                    </Badge>
                  )}
                  {profile && (
                    <Badge
                      variant={profile.is_public ? "default" : "secondary"}
                      className="text-xs flex items-center gap-1"
                    >
                      {profile.is_public ? (
                        <>
                          <Eye className="h-3 w-3" /> Public
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" /> Private
                        </>
                      )}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {profile?.created_at
                    ? `Collector since ${new Date(profile.created_at).toLocaleDateString()}`
                    : "Registered Collector"}
                </p>
              </div>
            </div>

            {/* Privacy Controls for Profile Owner */}
            {isOwnProfile && profile && (
              <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                <div className="text-xs text-muted-foreground">
                  Status: {profile.is_public ? "Visible to all collectors" : "Hidden from directory"}
                </div>
                <Button
                  variant={profile.is_public ? "outline" : "default"}
                  size="sm"
                  onClick={handleTogglePrivacy}
                  disabled={updatePrivacy.isPending}
                  className="gap-2"
                >
                  {updatePrivacy.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : profile.is_public ? (
                    <>
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                      <span>Make Profile Private</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      <span>Make Profile Public</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Banknotes in Collection</CardTitle>
            <BanknoteIcon className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{banknotesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Cataloged banknotes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Countries Represented</CardTitle>
            <Globe className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{countriesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Distinct issuing countries</p>
          </CardContent>
        </Card>
      </div>

      {/* Banknote Collection Showcase */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Banknote Collection</h2>
            <p className="text-sm text-muted-foreground">
              {banknotesCount === 1 ? "1 banknote" : `${banknotesCount} banknotes`} in {displayName}'s collection
            </p>
          </div>
        </div>

        {banknotes.length > 0 && (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search banknotes by name, currency, year, grade, or country..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
                aria-label="Search this collection"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger aria-label="Filter by currency"><SelectValue placeholder="Currency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All currencies</SelectItem>
                  {filterOptions.currencies.map(([id, label]) => (
                    <SelectItem key={id} value={id}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger aria-label="Filter by country"><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  {filterOptions.countries.map((country) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger aria-label="Filter by year"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {filterOptions.years.map((year) => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger aria-label="Filter by grade"><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All grades</SelectItem>
                  {["G", "VG", "F", "VF", "XF", "AU", "UNC"].map((grade) => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={groupBy}
                onValueChange={(value) => {
                  if (value === "none" || value === "country" || value === "currency" || value === "grade" || value === "year") {
                    setGroupBy(value)
                  }
                }}
              >
                <SelectTrigger aria-label="Group banknotes by"><SelectValue placeholder="Group by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  <SelectItem value="country">Group by country</SelectItem>
                  <SelectItem value="currency">Group by currency</SelectItem>
                  <SelectItem value="grade">Group by grade</SelectItem>
                  <SelectItem value="year">Group by year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Showing {filteredBanknotes.length} of {banknotesCount} banknotes
            </p>
          </div>
        )}

        {banknotes.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-3" />
            <CardTitle className="text-lg">No banknotes to display</CardTitle>
            <CardDescription className="mt-1">
              {isOwnProfile
                ? "You haven't added any banknotes to your collection yet."
                : "This collector has not added any banknotes to their collection yet."}
            </CardDescription>
            {isOwnProfile && (
              <Button asChild className="mt-4" size="sm">
                <Link href="/banknotes/new">Add Your First Banknote</Link>
              </Button>
            )}
          </Card>
        ) : filteredBanknotes.length === 0 ? (
          <Card className="p-8 text-center">
            <CardTitle className="text-lg">No matching banknotes</CardTitle>
            <CardDescription className="mt-2">Try changing the search or filters.</CardDescription>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {groupedBanknotes.map(([group, groupBanknotes]) => (
              <section key={group} className="col-span-full space-y-3">
                {groupBy !== "none" && <h3 className="text-lg font-semibold">{group}</h3>}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {groupBanknotes.map((banknote) => (
                    <BanknoteCard key={banknote.banknoteid} banknote={banknote} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
