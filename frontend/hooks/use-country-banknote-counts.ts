import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

export interface CountryMapCurrency {
  currencyid: number
  name: string
  code: string
}

interface BanknoteCountryRow {
  front_image: string | null
  front_thumbnail: string | null
  currencies: (CountryMapCurrency & {
    currencycountry: Array<{ countryid: number }>
  }) | Array<CountryMapCurrency & {
    currencycountry: Array<{ countryid: number }>
  }> | null
}

interface CountryCurrencyRow {
  countryid: number
  currencies: CountryMapCurrency | CountryMapCurrency[] | null
}

interface CountryMapData {
  banknoteCounts: Record<number, number>
  countryCurrencies: Record<number, CountryMapCurrency[]>
  banknoteImagesByCurrency: Record<number, string>
  collectionCurrencies: CountryMapCurrency[]
}

const EMPTY_COUNTRY_MAP_DATA: CountryMapData = {
  banknoteCounts: {},
  countryCurrencies: {},
  banknoteImagesByCurrency: {},
  collectionCurrencies: [],
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
    data: countryMapData = EMPTY_COUNTRY_MAP_DATA,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["country-map-data", user?.id],
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!user) return EMPTY_COUNTRY_MAP_DATA

      const [banknotesResult, countryCurrenciesResult] = await Promise.all([
        supabase
          .from("banknotes")
          .select("front_image,front_thumbnail,currencies(currencyid,name,code,currencycountry(countryid))")
          .eq("ownerid", user.id),
        supabase
          .from("currencycountry")
          .select("countryid,currencies(currencyid,name,code)"),
      ])
      if (banknotesResult.error) throw banknotesResult.error
      if (countryCurrenciesResult.error) throw countryCurrenciesResult.error

      const counts: Record<number, number> = {}
      const imagesByCurrency: Record<number, string> = {}
      const collectionCurrencies = new Map<number, CountryMapCurrency>()
      for (const banknote of (banknotesResult.data || []) as BanknoteCountryRow[]) {
        const currencies = Array.isArray(banknote.currencies)
          ? banknote.currencies
          : banknote.currencies
            ? [banknote.currencies]
            : []
        for (const currency of currencies) {
          collectionCurrencies.set(currency.currencyid, {
            currencyid: currency.currencyid,
            name: currency.name,
            code: currency.code,
          })
          const sampleImage = banknote.front_thumbnail || banknote.front_image
          if (sampleImage && !imagesByCurrency[currency.currencyid]) {
            imagesByCurrency[currency.currencyid] = sampleImage
          }
          for (const association of currency.currencycountry || []) {
            counts[association.countryid] = (counts[association.countryid] || 0) + 1
          }
        }
      }

      const currenciesByCountry: Record<number, CountryMapCurrency[]> = {}
      for (const row of (countryCurrenciesResult.data || []) as CountryCurrencyRow[]) {
        const currencies = Array.isArray(row.currencies)
          ? row.currencies
          : row.currencies
            ? [row.currencies]
            : []
        const countryCurrencies = currenciesByCountry[row.countryid] || (currenciesByCountry[row.countryid] = [])
        for (const currency of currencies) {
          if (!countryCurrencies.some((item) => item.currencyid === currency.currencyid)) {
            countryCurrencies.push(currency)
          }
        }
      }

      return {
        banknoteCounts: counts,
        countryCurrencies: currenciesByCountry,
        banknoteImagesByCurrency: imagesByCurrency,
        collectionCurrencies: Array.from(collectionCurrencies.values()).sort((a, b) =>
          a.code.localeCompare(b.code) || a.currencyid - b.currencyid,
        ),
      }
    },
  })

  return {
    ...countryMapData,
    isLoading: isLoadingUser || Boolean(user && isLoading),
    error,
  }
}
