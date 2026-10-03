"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Users, Banknote as BanknoteIcon, Globe, ArrowRight, ArrowUpDown, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUsers } from "@/hooks/use-users"

export default function UsersDirectoryPage() {
  const { users, currentUser, isLoading, error, refetch, isRefetching } = useUsers()
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("banknotes-desc")

  const processedUsers = useMemo(() => {
    // 1. Filter
    let result = users
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (user) =>
          (user.full_name && user.full_name.toLowerCase().includes(term)) ||
          user.id.toLowerCase().includes(term)
      )
    }

    // 2. Sort
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "banknotes-desc":
          return (b.banknotesCount ?? 0) - (a.banknotesCount ?? 0)
        case "banknotes-asc":
          return (a.banknotesCount ?? 0) - (b.banknotesCount ?? 0)
        case "countries-desc":
          return (b.countriesCount ?? 0) - (a.countriesCount ?? 0)
        case "countries-asc":
          return (a.countriesCount ?? 0) - (b.countriesCount ?? 0)
        case "name-asc":
          return (a.full_name || "Anonymous").localeCompare(b.full_name || "Anonymous")
        case "name-desc":
          return (b.full_name || "Anonymous").localeCompare(a.full_name || "Anonymous")
        case "newest":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        case "oldest":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        default:
          return 0
      }
    })
  }, [users, searchTerm, sortBy])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collectors Directory</h1>
          <p className="text-muted-foreground">
            Explore fellow collectors and discover banknotes from around the world.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search collectors by name..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-56">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="banknotes-desc">Most Banknotes</SelectItem>
                <SelectItem value="banknotes-asc">Fewest Banknotes</SelectItem>
                <SelectItem value="countries-desc">Most Countries</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="newest">Recently Joined</SelectItem>
                <SelectItem value="oldest">Earliest Joined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-sm text-muted-foreground text-right">
          {processedUsers.length} {processedUsers.length === 1 ? "collector" : "collectors"} visible
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="overflow-hidden animate-pulse">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-3">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-3">
                <div className="h-8 bg-muted rounded" />
              </CardContent>
              <CardFooter className="pt-2">
                <div className="h-9 bg-muted rounded w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : processedUsers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-xl">No public collectors found</CardTitle>
          <CardDescription className="mt-1 max-w-sm">
            {searchTerm
              ? `No collectors match "${searchTerm}". Try a different search term.`
              : "There are currently no public collectors in the directory."}
          </CardDescription>
          {searchTerm && (
            <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
              Clear search
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {processedUsers.map((collector) => {
            const displayName = collector.full_name || "Anonymous Collector"
            const initials = displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
            const isMe = currentUser?.id === collector.id

            return (
              <Card
                key={collector.id}
                className={`flex flex-col hover:shadow-md transition-shadow ${
                  isMe ? "border-primary/50 ring-1 ring-primary/20" : ""
                }`}
              >
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-3">
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={collector.avatar_url || ""} alt={displayName} />
                    <AvatarFallback className="font-semibold">{initials || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="overflow-hidden flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/users/${collector.id}`}
                        className="font-semibold text-base hover:underline hover:text-primary transition-colors truncate"
                      >
                        {displayName}
                      </Link>
                      {isMe && (
                        <Badge
                          variant="secondary"
                          className="text-[11px] px-1.5 py-0 h-4 font-semibold shrink-0 bg-primary/10 text-primary border border-primary/20"
                        >
                          Me
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {collector.created_at
                        ? `Joined ${new Date(collector.created_at).toLocaleDateString()}`
                        : "Member"}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-2 pb-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-2.5 text-xs">
                      <BanknoteIcon className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{collector.banknotesCount ?? 0} Banknotes</span>
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-2.5 text-xs">
                      <Globe className="h-3.5 w-3.5 text-blue-600" />
                      <span>{collector.countriesCount ?? 0} Countries</span>
                    </Badge>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t">
                  <Button asChild variant="default" className="w-full" size="sm">
                    <Link href={`/users/${collector.id}`} className="flex items-center justify-center gap-2">
                      <span>View Collection</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
