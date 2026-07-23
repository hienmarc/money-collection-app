import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from '@/utils/supabase/client'
import { Banknote } from "@/lib/types"
import { useStorageUnits } from "./use-storage-units"
import { useCurrencies } from "./use-currencies"

export function useDashboardData(timeRange: string, currencyFilter: string) {
  const supabase = createClient()
  const { currencies = [] } = useCurrencies()
  const { storageUnits = [] } = useStorageUnits()

  const { data: rawBanknotes = [], isLoading: isLoadingBanknotes } = useQuery({
    queryKey: ["banknotes-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banknotes").select("*, currencies(code, name)")
      if (error) throw error
      return data as Banknote[]
    },
  })

  const { data: countries = [] } = useQuery({
    queryKey: ["countries-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("countries").select("*")
      if (error) throw error
      return data
    },
  })

  const processedData = useMemo(() => {
    let banknotes = [...rawBanknotes]

    // Apply filters
    if (timeRange !== "all") {
      const currentYear = new Date().getFullYear()
      const yearThreshold = currentYear - Number.parseInt(timeRange)
      banknotes = banknotes.filter((banknote) => banknote.year >= yearThreshold)
    }

    if (currencyFilter !== "all") {
      banknotes = banknotes.filter((banknote) => banknote.currencyid.toString() === currencyFilter)
    }

    const stats = calculateAdvancedStats(banknotes)
    const rankings = calculateRankings(banknotes)
    const banknoteOfTheDay = getBanknoteOfTheDay(banknotes)

    return {
      banknotes,
      stats,
      rankings,
      banknoteOfTheDay,
    }
  }, [rawBanknotes, timeRange, currencyFilter])

  return {
    ...processedData,
    currencies,
    countries,
    storageUnits,
    isLoading: isLoadingBanknotes,
    totalBanknotes: processedData.banknotes.length,
    totalCurrencies: currencies.length,
    totalCountries: countries.length,
    totalStorageUnits: storageUnits.length,
  }
}

function calculateAdvancedStats(banknotes: Banknote[]) {
  if (!banknotes.length) {
    return {
      averageValue: 0,
      mostCommonYear: null,
      oldestBanknote: null,
      newestBanknote: null,
      mostValuableBanknote: null,
      averageDimensions: { width: 0, height: 0 },
    }
  }

  const totalValue = banknotes.reduce((sum, banknote) => sum + (banknote.denomination || 0), 0)
  const averageValue = totalValue / banknotes.length

  const yearCounts = banknotes.reduce((acc: Record<number, number>, banknote) => {
    if (banknote.year) {
      acc[banknote.year] = (acc[banknote.year] || 0) + 1
    }
    return acc
  }, {})

  const mostCommonYear = Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  const sortedByYear = [...banknotes].sort((a, b) => a.year - b.year)
  const oldestBanknote = sortedByYear[0]
  const newestBanknote = sortedByYear[sortedByYear.length - 1]

  const mostValuableBanknote = [...banknotes].sort((a, b) => b.denomination - a.denomination)[0]

  const banknotesWithDimensions = banknotes.filter((b) => b.width && b.height)
  let averageDimensions = { width: 0, height: 0 }

  if (banknotesWithDimensions.length) {
    const totalWidth = banknotesWithDimensions.reduce((sum, b) => sum + b.width, 0)
    const totalHeight = banknotesWithDimensions.reduce((sum, b) => sum + b.height, 0)
    averageDimensions = {
      width: totalWidth / banknotesWithDimensions.length,
      height: totalHeight / banknotesWithDimensions.length,
    }
  }

  return {
    averageValue,
    mostCommonYear,
    oldestBanknote,
    newestBanknote,
    mostValuableBanknote,
    averageDimensions,
  }
}

function calculateRankings(banknotes: Banknote[]) {
  if (!banknotes.length) {
    return {
      highestDenomination: [],
      lowestDenomination: [],
      oldestBanknotes: [],
      newestBanknotes: [],
      largestBanknotes: [],
      smallestBanknotes: [],
      widestBanknotes: [],
      tallestBanknotes: [],
    }
  }

  const withDenomination = banknotes.filter((b) => b.denomination !== null && b.denomination !== undefined)
  const withYear = banknotes.filter((b) => b.year !== null && b.year !== undefined)
  const withDimensions = banknotes.filter((b) => b.width && b.height)

  return {
    highestDenomination: [...withDenomination].sort((a, b) => b.denomination - a.denomination).slice(0, 5),
    lowestDenomination: [...withDenomination].sort((a, b) => a.denomination - b.denomination).slice(0, 5),
    oldestBanknotes: [...withYear].sort((a, b) => a.year - b.year).slice(0, 5),
    newestBanknotes: [...withYear].sort((a, b) => b.year - a.year).slice(0, 5),
    largestBanknotes: [...withDimensions].sort((a, b) => b.width * b.height - a.width * a.height).slice(0, 5),
    smallestBanknotes: [...withDimensions].sort((a, b) => a.width * a.height - b.width * b.height).slice(0, 5),
    widestBanknotes: [...withDimensions].sort((a, b) => b.width - a.width).slice(0, 5),
    tallestBanknotes: [...withDimensions].sort((a, b) => b.height - a.height).slice(0, 5),
  }
}

function getBanknoteOfTheDay(banknotes: Banknote[]) {
  if (!banknotes.length) return null

  const today = new Date()
  const dateString =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0")

  let hash = 0
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }

  const index = Math.abs(hash) % banknotes.length
  return banknotes[index]
}
