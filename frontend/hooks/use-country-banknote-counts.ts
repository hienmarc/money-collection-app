import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

interface BanknoteCountryRow {
  currencies: {
    currencycountry: Array<{ countryid: number }>
  } | Array<{
    currencycountry: Array<{ countryid: number }>
  }> | null
}

export function useCountryBanknoteCounts() {
  const supabase = createClient()

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["currentAuthUser"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      return data.user
    },
  })

  const {
    data: banknoteCounts = {},
    isLoading,
    error,
  } = useQuery({
    queryKey: ["country-banknote-counts", user?.id],
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!user) return {}

      const { data, error } = await supabase
        .from("banknotes")
        .select("currencies(currencycountry(countryid))")
        .eq("ownerid", user.id)
      if (error) throw error

      const counts: Record<number, number> = {}
      for (const banknote of (data || []) as BanknoteCountryRow[]) {
        const currencies = Array.isArray(banknote.currencies)
          ? banknote.currencies
          : banknote.currencies
            ? [banknote.currencies]
            : []
        for (const currency of currencies) {
          for (const association of currency.currencycountry || []) {
            counts[association.countryid] = (counts[association.countryid] || 0) + 1
          }
        }
      }

      return counts
    },
  })

  return { banknoteCounts, isLoading: isLoadingUser || Boolean(user && isLoading), error }
}
