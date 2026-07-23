import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/use-toast"
import { StorageUnit } from "@/lib/types"
import { createClient } from "@/utils/supabase/client"

const STORAGE_UNITS_QUERY_KEY = "storageUnits"
const STORAGE_UNITS_TABLE_NAME = "storageunits"

export function useStorageUnits() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: storageUnits = [], isLoading, refetch } = useQuery({
    queryKey: [STORAGE_UNITS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from(STORAGE_UNITS_TABLE_NAME).select("*")
      if (error) throw error
      return data as StorageUnit[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from(STORAGE_UNITS_TABLE_NAME).delete().eq("storageunitid", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Storage unit deleted successfully." })
      queryClient.invalidateQueries({ queryKey: [STORAGE_UNITS_QUERY_KEY] })
    },
    onError: (error) => {
      console.error("Error deleting storage unit:", error)
      toast({ title: "Error", description: "Failed to delete storage unit.", variant: "destructive" })
    },
  })

  return {
    storageUnits,
    isLoading,
    refreshStorageUnits: refetch,
    deleteStorageUnit: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  }
}
