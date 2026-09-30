"use client"

import { use } from "react"
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
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import BanknoteCard from "@/components/BanknoteCard"
import { useUserProfile, useUpdateProfilePrivacy } from "@/hooks/use-users"

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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {banknotes.map((banknote) => (
              <BanknoteCard key={banknote.banknoteid} banknote={banknote} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
