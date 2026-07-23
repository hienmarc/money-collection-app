import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Banknote } from "@/lib/types"

interface BanknoteQuickViewProps {
  banknote: Banknote | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BanknoteQuickView({ banknote, open, onOpenChange }: BanknoteQuickViewProps) {
  const router = useRouter()
  if (!banknote) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{banknote.code}</DialogTitle>
          <DialogDescription>
            {banknote.denomination} {banknote.currencies?.code} ({banknote.year})
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="aspect-[5/3] bg-muted rounded-md overflow-hidden">
              <img
                src={banknote.front_image || "/placeholder.svg"}
                alt={`Front of ${banknote.code}`}
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">Front</p>
          </div>
          <div className="space-y-2">
            <div className="aspect-[5/3] bg-muted rounded-md overflow-hidden">
              <img
                src={banknote.back_image || "/placeholder.svg"}
                alt={`Back of ${banknote.code}`}
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">Back</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Details</h4>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Denomination:</span> {banknote.denomination}
              </p>
              <p>
                <span className="text-muted-foreground">Currency:</span> {banknote.currencies?.code} (
                {banknote.currencies?.name})
              </p>
              <p>
                <span className="text-muted-foreground">Year:</span> {banknote.year}
              </p>
              <p>
                <span className="text-muted-foreground">Grade:</span> {banknote.grade}
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Physical Properties</h4>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Width:</span> {banknote.width} mm
              </p>
              <p>
                <span className="text-muted-foreground">Height:</span> {banknote.height} mm
              </p>
              <p>
                <span className="text-muted-foreground">Material:</span> {banknote.material}
              </p>
              <p>
                <span className="text-muted-foreground">Storage:</span> {banknote.storageunits?.name}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                router.push(`/banknotes/${banknote.banknoteid}/edit`)
              }}
            >
              Edit
            </Button>
            <Link href={`/banknotes/${banknote.banknoteid}`}>
              <Button>View Full Details</Button>
            </Link>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
