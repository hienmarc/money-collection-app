"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

export function useIsAdmin() {
  const supabase = createClient()
  const query = useQuery({
    queryKey: ["current-user-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_current_user_admin")
      if (error) throw error
      return data === true
    },
  })

  return {
    isAdmin: query.data === true && !query.error,
    isLoading: query.isLoading,
    error: query.error,
  }
}
