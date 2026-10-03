import { useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { UserProfile, Banknote } from "@/lib/types"

export function useUsers() {
  const supabase = createClient()

  const { data: users = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      // 1. Fetch public profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_public, created_at, updated_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false })

      if (profilesError) throw profilesError
      if (!profiles || profiles.length === 0) return []

      // 2. Fetch accessible banknotes with country references to aggregate stats
      const { data: banknotes, error: banknotesError } = await supabase
        .from("banknotes")
        .select(`
          banknoteid,
          ownerid,
          currencyid,
          currencies (
            currencyid,
            currencycountry (
              countryid
            )
          )
        `)

      if (banknotesError) throw banknotesError

      // Group banknotes and unique countries by owner
      const userStatsMap = new Map<string, { banknotesCount: number; countryIds: Set<number> }>()

      for (const note of banknotes || []) {
        if (!note.ownerid) continue
        let entry = userStatsMap.get(note.ownerid)
        if (!entry) {
          entry = { banknotesCount: 0, countryIds: new Set<number>() }
          userStatsMap.set(note.ownerid, entry)
        }
        entry.banknotesCount += 1

        const currencies = note.currencies as any
        const currencyCountries = currencies?.currencycountry || []
        for (const cc of currencyCountries) {
          if (cc?.countryid) {
            entry.countryIds.add(cc.countryid)
          }
        }
      }

      return profiles.map((p) => {
        const stats = userStatsMap.get(p.id)
        return {
          ...p,
          banknotesCount: stats?.banknotesCount ?? 0,
          countriesCount: stats?.countryIds.size ?? 0,
        } as UserProfile
      })
    },
  })

  const { data: currentUser } = useQuery({
    queryKey: ["currentAuthUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
  })

  return {
    users,
    currentUser,
    isLoading,
    error,
    refetch,
    isRefetching,
  }
}

export function useUserProfile(userId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  // 1. Get current logged-in user
  const { data: currentAuthUser } = useQuery({
    queryKey: ["currentAuthUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
  })

  const isOwnProfile = !!(currentAuthUser && currentAuthUser.id === userId)

  // 2. Fetch the target user's profile
  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_public, created_at, updated_at")
        .eq("id", userId)
        .maybeSingle()

      if (error) throw error
      return data as UserProfile | null
    },
    enabled: !!userId,
  })

  // 3. Fetch the target user's banknotes
  const {
    data: banknotes = [],
    isLoading: isLoadingBanknotes,
    error: banknotesError,
    refetch: refetchBanknotes,
  } = useQuery({
    queryKey: ["userBanknotes", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banknotes")
        .select(`
          *,
          currencies (
            name,
            code,
            currencycountry (
              countryid,
              countries (
                countryid,
                name,
                code
              )
            )
          ),
          storageunits (
            name
          )
        `)
        .eq("ownerid", userId)
        .order("added_on", { ascending: false })

      if (error) throw error
      return (data || []) as Banknote[]
    },
    enabled: !!userId && (isOwnProfile || profile?.is_public === true),
  })

  // 4. Compute unique countries count
  const countriesCount = useMemo(() => {
    const countryIds = new Set<string | number>()
    for (const note of banknotes) {
      const currencies = note.currencies as any
      const currencyCountries = currencies?.currencycountry || []
      for (const cc of currencyCountries) {
        if (cc?.countries?.name) {
          countryIds.add(cc.countries.name)
        } else if (cc?.countryid) {
          countryIds.add(cc.countryid)
        }
      }
    }
    return countryIds.size
  }, [banknotes])

  // Profile is considered private if:
  // - we aren't the owner AND (profile is null due to RLS OR profile.is_public is false)
  const isPrivate = !isLoadingProfile && !isOwnProfile && (!profile || !profile.is_public)

  return {
    profile,
    banknotes,
    banknotesCount: banknotes.length,
    countriesCount,
    isOwnProfile,
    isPrivate,
    isLoading: isLoadingProfile || isLoadingBanknotes,
    error: profileError || banknotesError,
    refetch: () => {
      refetchProfile()
      refetchBanknotes()
    },
  }
}

export function useUpdateProfilePrivacy() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, isPublic }: { userId: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (error) throw error
      return isPublic
    },
    onSuccess: (isPublic, { userId }) => {
      toast({
        title: "Privacy settings updated",
        description: `Your profile is now ${isPublic ? "public" : "private"}.`,
      })
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] })
    },
    onError: (error) => {
      console.error("Error updating profile privacy:", error)
      toast({
        title: "Error",
        description: "Failed to update profile privacy.",
        variant: "destructive",
      })
    },
  })
}
