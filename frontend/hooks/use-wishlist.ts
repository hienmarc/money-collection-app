import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { toast } from "@/components/ui/use-toast"
import type { WishlistItem } from "@/lib/types"
import type { NumistaBanknote } from "@/components/NumistaBanknoteCard"

export function useWishlist(userId?: string, canView = true) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const {
    data: currentUser,
    isLoading: isLoadingCurrentUser,
    error: currentUserError,
  } = useQuery({
    queryKey: ["currentAuthUser"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      return data.user
    },
  })

  const targetUserId = userId ?? currentUser?.id
  const isOwnWishlist = !!currentUser && currentUser.id === targetUserId

  const {
    data: items = [],
    isLoading: isLoadingWishlist,
    error: wishlistError,
  } = useQuery({
    queryKey: ["wishlist", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return []
      const { data, error } = await supabase
        .from("wishlist")
        .select("*")
        .eq("ownerid", targetUserId)
        .order("level", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) throw error
      return (data || []) as WishlistItem[]
    },
    enabled: !!targetUserId && canView,
  })

  const addOrUpdate = useMutation({
    mutationFn: async ({ banknote, level }: { banknote: NumistaBanknote; level: number }) => {
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!data.user) throw new Error("Sign in to add banknotes to your wishlist.")

      const numistaid = Number(banknote.id)
      if (!Number.isSafeInteger(numistaid) || numistaid <= 0) {
        throw new Error("This banknote does not have a valid Numista ID.")
      }

      let valueCurrency = banknote.value?.currency?.code
      const numistaCurrencyId = Number(banknote.value?.currency?.id)
      if (!valueCurrency && Number.isSafeInteger(numistaCurrencyId) && numistaCurrencyId > 0) {
        const { data: currency, error: currencyError } = await supabase
          .from("currencies")
          .select("code")
          .eq("numistaid", numistaCurrencyId)
          .maybeSingle()

        if (currencyError) throw currencyError
        valueCurrency = currency?.code
      }

      const { error } = await supabase.from("wishlist").upsert(
        {
          ownerid: data.user.id,
          numistaid,
          min_year: banknote.min_year ?? null,
          max_year: banknote.max_year ?? null,
          title: banknote.title || "Untitled banknote",
          country: banknote.issuer?.name || "Unknown",
          obverse_thumbnail: banknote.obverse_thumbnail ?? null,
          value_amount: banknote.value?.numeric_value ?? null,
          value_currency: valueCurrency ?? null,
          value_text: banknote.value?.text ?? null,
          level,
        },
        { onConflict: "ownerid,numistaid" },
      )

      if (error) throw error
      return data.user.id
    },
    onSuccess: (ownerId) => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", ownerId] })
      toast({ title: "Wishlist updated", description: "Your banknote wishlist has been updated." })
    },
    onError: (error) => {
      console.error("Error updating wishlist:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update your wishlist.",
        variant: "destructive",
      })
    },
  })

  const updateLevel = useMutation({
    mutationFn: async ({ wishlistId, level }: { wishlistId: number; level: number }) => {
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!data.user) throw new Error("Sign in to edit your wishlist.")

      const { error } = await supabase
        .from("wishlist")
        .update({ level })
        .eq("wishlistid", wishlistId)
        .eq("ownerid", data.user.id)

      if (error) throw error
      return data.user.id
    },
    onSuccess: (ownerId) => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", ownerId] })
      toast({ title: "Wishlist updated", description: "Your banknote priority has been updated." })
    },
    onError: (error) => {
      console.error("Error updating wishlist level:", error)
      toast({ title: "Error", description: "Failed to update your wishlist.", variant: "destructive" })
    },
  })

  const remove = useMutation({
    mutationFn: async (wishlistId: number) => {
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!data.user) throw new Error("Sign in to edit your wishlist.")

      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("wishlistid", wishlistId)
        .eq("ownerid", data.user.id)

      if (error) throw error
      return data.user.id
    },
    onSuccess: (ownerId) => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", ownerId] })
      toast({ title: "Removed from wishlist", description: "The banknote was removed from your wishlist." })
    },
    onError: (error) => {
      console.error("Error removing wishlist entry:", error)
      toast({ title: "Error", description: "Failed to remove the banknote.", variant: "destructive" })
    },
  })

  return {
    currentUser,
    isLoadingCurrentUser,
    currentUserError,
    targetUserId,
    isOwnWishlist,
    items,
    isLoading: isLoadingWishlist,
    error: wishlistError,
    addOrUpdate,
    updateLevel,
    remove,
  }
}
