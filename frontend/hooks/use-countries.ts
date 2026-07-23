import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from '@/utils/supabase/client'
import { toast } from "@/components/ui/use-toast"

export interface Country {
  countryid: number
  name: string
  code: string
  flagUrl?: string
  continent?: string
}

const EMPTY_COUNTRIES: Country[] = []

export function useCountries() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("countries").select("*")
      if (error) throw error

      // Fetch flag URLs and continent information for each country
      // Note: In a real app, you might want to save this to your DB to avoid rate limiting
      const countriesWithDetails = await Promise.all(
        (data || []).map(async (country) => {
          try {
            const encodedName = encodeURIComponent(country.name)
            const response = await fetch(
              `/api/countries/details?name=${encodedName}&response_fields=flag.url_svg,flag.url_png,region`
            )
            if (!response.ok) return { ...country, continent: "Unknown" }
            const resJson = await response.json()
            const countryData = resJson.data?.objects?.[0]
            return {
              ...country,
              flagUrl: countryData?.flag?.url_svg || countryData?.flag?.url_png,
              continent: countryData?.region || "Unknown",
            }
          } catch (error) {
            console.error(`Error fetching details for ${country.name}:`, error)
            return { ...country, continent: "Unknown" }
          }
        }),
      )
      return countriesWithDetails as Country[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("countries").delete().eq("countryid", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Country deleted successfully." })
      queryClient.invalidateQueries({ queryKey: ["countries"] })
    },
    onError: (error) => {
      console.error("Error deleting country:", error)
      toast({ title: "Error", description: "Failed to delete country.", variant: "destructive" })
    },
  })

  const countries = data || EMPTY_COUNTRIES

  return {
    countries,
    isLoading,
    isRefetching,
    refreshCountries: refetch,
    deleteCountry: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  }
}
