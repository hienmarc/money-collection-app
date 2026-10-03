"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Camera, CheckCircle2, Clock3, Loader2, Plus, Search, Trash2, UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDeleteImageSearch, useImageSearchJobs, useUploadImageSearch } from "@/hooks/use-image-search"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png"])

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export default function ImageSearchPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [fileError, setFileError] = useState("")
  const [pollUntil, setPollUntil] = useState(0)
  const jobs = useImageSearchJobs(pollUntil)
  const upload = useUploadImageSearch()
  const remove = useDeleteImageSearch()
  const allJobs = jobs.data?.pages.flatMap((page) => page.jobs) ?? []

  useEffect(() => {
    if (!file) {
      setPreviewUrl("")
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null
    event.target.value = ""
    if (!selected) return
    if (!ACCEPTED_TYPES.has(selected.type)) {
      upload.reset()
      setFile(null)
      setFileError("Choose a JPEG or PNG image.")
      return
    }
    if (selected.size > MAX_IMAGE_BYTES) {
      upload.reset()
      setFile(null)
      setFileError("Image size must be 5 MB or smaller.")
      return
    }
    upload.reset()
    setFileError("")
    setFile(selected)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) return
    upload.mutate(file, {
      onSuccess: () => {
        setFile(null)
        setPollUntil(Date.now() + 30_000)
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search by Image</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a clear photo of a banknote to identify it and search the Numista catalog.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start a search</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="flex min-h-36 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-6 text-center">
              {previewUrl ? (
                <img src={previewUrl} alt="Selected banknote preview" className="max-h-52 max-w-full object-contain" />
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  <span className="font-medium">Choose an image or take a photo</span>
                  <span className="mt-1 text-sm text-muted-foreground">Maximum size: 5 MB</span>
                </>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Choose image
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png"
                    disabled={upload.isPending}
                    onChange={selectFile}
                  />
                </label>
                <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                  <Camera className="mr-2 h-4 w-4" />
                  Take photo
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png"
                    capture="environment"
                    disabled={upload.isPending}
                    onChange={selectFile}
                  />
                </label>
              </div>
            </div>
            {file && <p className="text-sm text-muted-foreground">{file.name}</p>}
            {fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}
            {upload.isError && <p role="alert" className="text-sm text-destructive">{upload.error.message}</p>}
            {!file && !upload.isPending && upload.isIdle && (
              <p className="text-sm text-muted-foreground">Only JPEG/PNG images up to 5 MB are supported.</p>
            )}
            <Button type="submit" disabled={!file || upload.isPending}>
              {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {upload.isPending ? "Uploading..." : "Search banknote"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4" aria-labelledby="search-history-title">
        <div className="flex items-center justify-between">
          <h2 id="search-history-title" className="text-2xl font-semibold">Recent searches</h2>
          {jobs.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Refreshing searches" />}
        </div>

        {jobs.isError && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {jobs.error.message}
          </p>
        )}
        {jobs.isLoading && <p className="text-muted-foreground">Loading image searches...</p>}
        {!jobs.isLoading && !jobs.isError && allJobs.length === 0 && (
          <p className="rounded-lg border p-6 text-center text-muted-foreground">No image searches yet.</p>
        )}

        <div className="space-y-4">
          {allJobs.map((job) => (
            <Card key={job.job_id}>
              <CardContent className="grid gap-4 p-4 sm:grid-cols-[160px_1fr]">
                <div className="flex min-h-32 items-center justify-center overflow-hidden rounded bg-muted">
                  {job.image_url ? (
                    <img src={job.image_url} alt="Uploaded banknote" className="max-h-48 w-full object-contain" />
                  ) : (
                    <span className="text-sm text-muted-foreground">Image unavailable</span>
                  )}
                </div>
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">Search from {formatDate(job.created_at)}</p>
                      <p className="text-xs text-muted-foreground">Results and image expire after 3 days</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Status status={job.status} />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete image search"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(job.job_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {remove.isError && <p role="alert" className="text-sm text-destructive">{remove.error.message}</p>}
                  {job.error && <p className="text-sm text-destructive">{job.error}</p>}

                  {job.identification && (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-3">
                      <Identification label="Country" value={job.identification.country} />
                      <Identification label="Currency" value={job.identification.currency} />
                      <Identification label="Face value" value={job.identification.face_value} />
                      <Identification label="Year" value={job.identification.year} />
                      <Identification label="Serial number" value={job.identification.serial_number} />
                    </dl>
                  )}

                  {job.search_query && (
                    <p className="text-xs text-muted-foreground">Numista query: {job.search_query || "No searchable fields"}</p>
                  )}
                  {job.status === "completed" && job.results.length === 0 && (
                    <p className="text-sm text-muted-foreground">No matching banknotes found in Numista.</p>
                  )}
                  {job.results.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {job.results.map((result, index) => (
                        <div key={result.id ?? index} className="flex gap-3 rounded-md border p-3">
                          {result.obverse_thumbnail && (
                            <img src={result.obverse_thumbnail} alt="" className="h-16 w-20 shrink-0 object-contain" />
                          )}
                          <div className="flex min-w-0 flex-1 flex-col items-start">
                            <p className="font-medium">{result.title || "Banknote match"}</p>
                            <p className="text-sm text-muted-foreground">{result.issuer?.name}</p>
                            <p className="mb-3 text-sm text-muted-foreground">
                              {[result.value?.text, result.min_year, result.max_year]
                                .filter((value) => value !== undefined && value !== "")
                                .join(" · ")}
                            </p>
                            {result.id != null && (
                              <Button
                                size="sm"
                                className="mt-auto"
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    numista_id: String(result.id),
                                    return_url: "/image-search",
                                  })
                                  const serialNumber = job.identification?.serial_number
                                  if (serialNumber) params.set("serial_number", serialNumber)
                                  router.push(`/banknotes/new?${params.toString()}`)
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add to collection
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {jobs.hasNextPage && (
          <Button variant="outline" disabled={jobs.isFetchingNextPage} onClick={() => jobs.fetchNextPage()}>
            {jobs.isFetchingNextPage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load more searches
          </Button>
        )}
      </section>
    </div>
  )
}

function Status({ status }: { status: string }) {
  const labels = {
    awaiting_upload: "Waiting for upload",
    processing: "Processing",
    completed: "Complete",
    failed: "Failed",
  }
  const Icon = status === "completed" ? CheckCircle2 : status === "failed" ? AlertCircle : Clock3
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs capitalize">
      <Icon className="h-3.5 w-3.5" />
      {labels[status as keyof typeof labels] || status}
    </span>
  )
}

function Identification({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value || "Unknown"}</dd>
    </div>
  )
}
