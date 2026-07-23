import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { Banknote } from "@/lib/types"

interface BanknoteGridViewProps {
  banknotes: Banknote[]
  selectedBanknotes: string[]
  onSelectBanknote: (id: string, checked: boolean) => void
  onQuickView: (banknote: Banknote) => void
  onDelete: (id: string) => void
}

export function BanknoteGridView({
  banknotes,
  selectedBanknotes,
  onSelectBanknote,
  onQuickView,
  onDelete,
}: BanknoteGridViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {banknotes.map((banknote) => (
        <Card key={banknote.banknoteid} className="overflow-hidden hover:shadow-md transition-shadow">
          <div className="relative">
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedBanknotes.includes(banknote.banknoteid)}
                onCheckedChange={(checked) => onSelectBanknote(banknote.banknoteid, !!checked)}
              />
            </div>
            <div
              className="h-40 bg-muted flex items-center justify-center cursor-pointer"
              onClick={() => onQuickView(banknote)}
            >
              {banknote.front_image ? (
                <img
                  src={banknote.front_image}
                  alt={banknote.code}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center">
                  <span className="text-xs mt-1">No image</span>
                </div>
              )}
            </div>
          </div>
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-lg leading-tight">
                {banknote.denomination} {banknote.currencies?.name}
              </h3>
              <Badge variant="outline" className="shrink-0 ml-2">{banknote.grade}</Badge>
            </div>
            <div className="space-y-1 text-sm mb-4">
              <p className="text-muted-foreground font-mono text-xs">
                {banknote.code}
              </p>
              <p>
                <span className="text-muted-foreground">Year:</span> {banknote.year}
              </p>
            </div>
            <div className="flex justify-between items-center mt-auto">
              <Link href={`/banknotes/${banknote.banknoteid}`}>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/banknotes/${banknote.banknoteid}/edit`}>Edit</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(banknote.banknoteid)} className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
