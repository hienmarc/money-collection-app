import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from '@/utils/supabase/client'
import { toast } from "@/components/ui/use-toast"
import { Banknote, Currency, StorageUnit, BanknoteFilters, SortConfig } from "@/lib/types"

const ITEMS_PER_PAGE = 500

export function useBanknotes() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "code",
    direction: "asc",
  })
  const [filters, setFilters] = useState<BanknoteFilters>({
    currency: "all",
    year: "all",
    material: "all",
    storageUnit: "all",
    grade: "all",
    denomination: {
      min: "",
      max: "",
    },
  })

  // Queries
  const { data: banknotes = [], isLoading: isLoadingBanknotes, refetch: refetchBanknotes, isRefetching } = useQuery({
    queryKey: ["banknotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banknotes").select(`
          *,
          currencies(code, name),
          storageunits(name)
        `)
      if (error) throw error
      return (data || []) as Banknote[]
    },
  })

  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("currencies").select("*")
      if (error) throw error
      return (data || []) as Currency[]
    },
  })

  const { data: storageUnits = [] } = useQuery({
    queryKey: ["storageUnits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("storageunits").select("*")
      if (error) throw error
      return (data || []) as StorageUnit[]
    },
  })

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banknotes").delete().eq("banknoteid", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Banknote deleted successfully." })
      queryClient.invalidateQueries({ queryKey: ["banknotes"] })
    },
    onError: (error) => {
      console.error("Error deleting banknote:", error)
      toast({ title: "Error", description: "Failed to delete banknote.", variant: "destructive" })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("banknotes").delete().in("banknoteid", ids)
      if (error) throw error
    },
    onSuccess: (_, ids) => {
      toast({ title: "Success", description: `${ids.length} banknotes deleted successfully.` })
      queryClient.invalidateQueries({ queryKey: ["banknotes"] })
    },
    onError: (error) => {
      console.error("Error deleting banknotes:", error)
      toast({ title: "Error", description: "Failed to delete banknotes.", variant: "destructive" })
    },
  })

  // Derived data
  const materials = useMemo(() => {
    return [...new Set(banknotes.map((b) => b.material).filter((m): m is string => !!m))].sort()
  }, [banknotes])

  const years = useMemo(() => {
    return [...new Set(banknotes.map((b) => b.year).filter(Boolean))].sort((a, b) => b - a)
  }, [banknotes])

  const filteredBanknotes = useMemo(() => {
    let result = [...banknotes]

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      result = result.filter(
        (banknote) =>
          banknote.code?.toLowerCase().includes(searchLower) ||
          banknote.denomination?.toString().includes(searchLower) ||
          banknote.year?.toString().includes(searchLower) ||
          banknote.currencies?.code?.toLowerCase().includes(searchLower) ||
          banknote.currencies?.name?.toLowerCase().includes(searchLower) ||
          banknote.material?.toLowerCase().includes(searchLower) ||
          banknote.storageunits?.name?.toLowerCase().includes(searchLower),
      )
    }

    if (filters.currency !== "all") {
      result = result.filter((banknote) => banknote.currencyid?.toString() === filters.currency)
    }
    if (filters.year !== "all") {
      result = result.filter((banknote) => banknote.year?.toString() === filters.year)
    }
    if (filters.material !== "all") {
      result = result.filter((banknote) => banknote.material === filters.material)
    }
    if (filters.storageUnit !== "all") {
      result = result.filter((banknote) => banknote.storageunitid?.toString() === filters.storageUnit)
    }
    if (filters.grade !== "all") {
      result = result.filter((banknote) => banknote.grade === filters.grade)
    }
    if (filters.denomination.min) {
      result = result.filter((banknote) => banknote.denomination >= Number.parseFloat(filters.denomination.min))
    }
    if (filters.denomination.max) {
      result = result.filter((banknote) => banknote.denomination <= Number.parseFloat(filters.denomination.max))
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue: any, bValue: any

        if (sortConfig.key === "currency") {
          aValue = a.currencies?.code || ""
          bValue = b.currencies?.code || ""
        } else if (sortConfig.key === "storageUnit") {
          aValue = a.storageunits?.name || ""
          bValue = b.storageunits?.name || ""
        } else {
          aValue = a[sortConfig.key as keyof Banknote] || ""
          bValue = b[sortConfig.key as keyof Banknote] || ""
        }

        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase()
          bValue = bValue.toLowerCase()
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
    }

    return result
  }, [banknotes, searchTerm, filters, sortConfig])

  const currentBanknotes = useMemo(() => {
    const firstPageIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const lastPageIndex = firstPageIndex + ITEMS_PER_PAGE
    return filteredBanknotes.slice(firstPageIndex, lastPageIndex)
  }, [currentPage, filteredBanknotes])

  const totalPages = Math.ceil(filteredBanknotes.length / ITEMS_PER_PAGE)

  // Handlers
  const handleSort = (key: SortConfig["key"]) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const handleFilterChange = (key: string, value: string) => {
    if (key.startsWith("denomination.")) {
      const [, child] = key.split(".")
      setFilters((prev) => ({
        ...prev,
        denomination: {
          ...prev.denomination,
          [child]: value,
        },
      }))
    } else {
      setFilters((prev) => ({ ...prev, [key]: value }))
    }
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      currency: "all",
      year: "all",
      material: "all",
      storageUnit: "all",
      grade: "all",
      denomination: { min: "", max: "" },
    })
    setSearchTerm("")
    setCurrentPage(1)
  }

  return {
    banknotes,
    filteredBanknotes,
    currentBanknotes,
    currencies,
    storageUnits,
    materials,
    years,
    isLoading: isLoadingBanknotes,
    isRefreshing: isRefetching,
    currentPage,
    setCurrentPage,
    totalPages,
    searchTerm,
    setSearchTerm,
    filters,
    handleFilterChange,
    clearFilters,
    sortConfig,
    handleSort,
    refreshData: refetchBanknotes,
    deleteBanknote: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    bulkDeleteBanknotes: bulkDeleteMutation.mutate,
    isBulkDeleting: bulkDeleteMutation.isPending,
    ITEMS_PER_PAGE,
  }
}

export function useBanknote(id: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: banknote, isLoading, error } = useQuery({
    queryKey: ["banknote", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banknotes")
        .select(`
          *,
          currencies(name, code),
          storageunits(name)
        `)
        .eq("banknoteid", id)
        .single()
      if (error) throw error
      return data as Banknote
    },
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedData: Partial<Banknote>) => {
      const { error } = await supabase.from("banknotes").update(updatedData).eq("banknoteid", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Banknote updated successfully." })
      queryClient.invalidateQueries({ queryKey: ["banknote", id] })
      queryClient.invalidateQueries({ queryKey: ["banknotes"] })
    },
    onError: (error) => {
      console.error("Error updating banknote:", error)
      toast({ title: "Error", description: "Failed to update banknote.", variant: "destructive" })
    },
  })

  return {
    banknote,
    isLoading,
    error,
    updateBanknote: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  }
}
