"use client"

import { notFound, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  Edit,
  Trash2,
  Share2,
  Heart,
  Ruler,
  CreditCard,
  DollarSign,
  Bookmark,
  Info,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RelatedBanknotes } from "@/components/RelatedBanknotes"
import { useBanknote, useBanknotes } from "@/hooks/use-banknotes"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function BanknoteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { banknote, isLoading, error } = useBanknote(params.id)
  const { deleteBanknote, isDeleting } = useBanknotes()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !banknote) {
    notFound()
  }

  const handleDelete = () => {
    deleteBanknote(params.id, {
      onSuccess: () => {
        router.push("/banknotes")
        router.refresh()
      },
    })
  }

  const currencyId = banknote.currencyid

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Back button and actions */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/banknotes" className="flex items-center text-muted-foreground hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span>Back to Banknotes</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Heart className="mr-2 h-4 w-4" />
            Add to Favorites
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/banknotes/${params.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Images */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-4">
              <div className="relative aspect-[5/3] w-full overflow-hidden rounded-lg mb-4">
                {banknote.front_image ? (
                  <Image
                    src={banknote.front_image || "/placeholder.svg"}
                    alt={`${banknote.denomination} ${banknote.currencies?.name} (${banknote.year})`}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-muted">
                    <CreditCard className="h-16 w-16 text-muted-foreground" />
                    <span className="text-muted-foreground">No image available</span>
                  </div>
                )}
              </div>

              {banknote.back_image && (
                <div className="relative aspect-[5/3] w-full overflow-hidden rounded-lg">
                  <Image
                    src={banknote.back_image || "/placeholder.svg"}
                    alt={`Reverse of ${banknote.denomination} ${banknote.currencies?.name} (${banknote.year})`}
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle column - Details */}
        <div className="md:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-1 mb-4">
                <h1 className="text-3xl font-bold">
                  {banknote.denomination} {banknote.currencies?.name} ({banknote.year})
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="outline">{banknote.currencies?.code}</Badge>
                  {banknote.grade && <Badge variant="secondary">{banknote.grade}</Badge>}
                </div>
              </div>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="collection">Collection Info</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2 flex items-center">
                        <Info className="mr-2 h-4 w-4" />
                        Basic Information
                      </h3>
                      <dl className="grid grid-cols-[120px_1fr] gap-2">
                        <dt className="text-muted-foreground">Denomination:</dt>
                        <dd className="font-medium">{banknote.denomination}</dd>

                        <dt className="text-muted-foreground">Currency:</dt>
                        <dd className="font-medium">
                          {banknote.currencies?.name} ({banknote.currencies?.code})
                        </dd>

                        <dt className="text-muted-foreground">Year:</dt>
                        <dd className="font-medium">{banknote.year}</dd>
                      </dl>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-2 flex items-center">
                        <Ruler className="mr-2 h-4 w-4" />
                        Physical Details
                      </h3>
                      <dl className="grid grid-cols-[120px_1fr] gap-2">
                        {(banknote.width || banknote.height) && (
                          <>
                            <dt className="text-muted-foreground">Dimensions:</dt>
                            <dd className="font-medium">
                              {banknote.width && banknote.height
                                ? `${banknote.width} × ${banknote.height} mm`
                                : "Not specified"}
                            </dd>
                          </>
                        )}

                        {banknote.material && (
                          <>
                            <dt className="text-muted-foreground">Material:</dt>
                            <dd className="font-medium">{banknote.material}</dd>
                          </>
                        )}
                      </dl>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Related Items Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Related Banknotes</h2>
        <RelatedBanknotes currentBanknoteId={params.id} currencyId={currencyId!} />
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Banknote</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this banknote? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
