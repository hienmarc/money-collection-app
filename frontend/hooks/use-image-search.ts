"use client"

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

export interface BanknoteIdentification {
  country: string | null
  currency: string | null
  face_value: string | null
  year: string | null
  serial_number: string | null
}

export interface NumistaMatch {
  id?: number | string
  title?: string
  issuer?: { name?: string }
  value?: { text?: string }
  min_year?: number
  max_year?: number
  obverse_thumbnail?: string
  reverse_thumbnail?: string
}

export interface ImageSearchJob {
  job_id: string
  status: "awaiting_upload" | "processing" | "completed" | "failed"
  created_at: string
  expires_at: number
  image_url?: string
  identification?: BanknoteIdentification
  search_query?: string
  results: NumistaMatch[]
  error?: string
}

const apiUrl = process.env.NEXT_PUBLIC_IMAGE_SEARCH_API_URL?.replace(/\/$/, "")

async function requestApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiUrl) {
    throw new Error("Image search is not configured for this deployment.")
  }

  const supabase = createClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session) throw new Error("Sign in to use image search.")

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${data.session.access_token}`,
      ...(init.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...init.headers,
    },
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(result?.error || "Image search request failed.")
  }
  return result as T
}

export function useImageSearchJobs(pollUntil = 0) {
  return useInfiniteQuery({
    queryKey: ["image-search-jobs"],
    queryFn: ({ pageParam }) =>
      requestApi<{ jobs: ImageSearchJob[]; next_cursor: string | null }>(
        `/v1/image-searches${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: (query) => {
      const active = query.state.data?.pages.some((page) => page.jobs.some((job) => {
        if (job.status === "processing") return true
        return job.status === "awaiting_upload" && Date.now() - Date.parse(job.created_at) < 10 * 60 * 1000
      }))
      return active || Date.now() < pollUntil ? 5000 : false
    },
  })
}

export function useUploadImageSearch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const job = await requestApi<{
        job_id: string
        upload: { url: string; fields: Record<string, string> }
      }>("/v1/image-searches", {
        method: "POST",
        body: JSON.stringify({ content_type: file.type, size: file.size }),
      })

      const form = new FormData()
      for (const [key, value] of Object.entries(job.upload.fields)) {
        form.append(key, value)
      }
      form.append("file", file)
      const upload = await fetch(job.upload.url, { method: "POST", body: form })
      if (!upload.ok) {
        throw new Error("The image upload failed. Please try again.")
      }
      return job.job_id
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["image-search-jobs"] }),
    onError: () => queryClient.invalidateQueries({ queryKey: ["image-search-jobs"] }),
  })
}

export function useDeleteImageSearch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) =>
      requestApi<{ deleted: boolean }>(`/v1/image-searches/${encodeURIComponent(jobId)}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["image-search-jobs"] }),
  })
}
