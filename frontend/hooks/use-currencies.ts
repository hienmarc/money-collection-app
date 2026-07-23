import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from '@/utils/supabase/client'
import { toast } from "@/components/ui/use-toast"
import { Currency } from "@/lib/types"

export interface CurrencyWithCountries extends Currency {
  countries: string[]
}

export const CURRENCIES_QUERY_KEY = "currencies"
export const CURRENCIES_WITH_COUNTRIES_QUERY_KEY = "currencies-full"
export const EXCHANGE_RATES_QUERY_KEY = "exchange-rates"

export function useCurrencies() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: currencies = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: [CURRENCIES_WITH_COUNTRIES_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from("currencies").select("*, currencycountry!inner(countries(*))")
      if (error) throw error

      const processedData = (data || []).map((currency: any) => ({
        ...currency,
        countries: (currency.currencycountry || []).map((cc: any) => cc.countries?.name).filter(Boolean),
      }))

      return processedData as CurrencyWithCountries[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("currencies").delete().eq("currencyid", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Currency deleted successfully." })
      queryClient.invalidateQueries({ queryKey: [CURRENCIES_WITH_COUNTRIES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [CURRENCIES_QUERY_KEY] })
    },
    onError: (error: any) => {
      console.error("Error deleting currency:", error)
      toast({ title: "Error", description: `Failed to delete currency: ${error.message}`, variant: "destructive" })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase.from("currencies").delete().in("currencyid", ids)
      if (error) throw error
    },
    onSuccess: (_, ids) => {
      toast({ title: "Success", description: `${ids.length} currencies deleted successfully.` })
      queryClient.invalidateQueries({ queryKey: [CURRENCIES_WITH_COUNTRIES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [CURRENCIES_QUERY_KEY] })
    },
    onError: (error: any) => {
      console.error("Error bulk deleting currencies:", error)
      toast({ title: "Error", description: `Failed to delete currencies: ${error.message}`, variant: "destructive" })
    },
  })

  return {
    currencies,
    isLoading,
    isRefetching,
    refreshCurrencies: refetch,
    deleteCurrency: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    bulkDeleteCurrencies: bulkDeleteMutation.mutate,
    isBulkDeleting: bulkDeleteMutation.isPending,
  }
}

export function useExchangeRates() {
  return useQuery({
    queryKey: [EXCHANGE_RATES_QUERY_KEY],
    queryFn: async () => {
      const response = await fetch("/api/exchange-rates")
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      return data.rates as Record<string, number>
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}
