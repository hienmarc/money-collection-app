import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react"
import { Banknote, SortConfig } from "@/lib/types"

interface BanknoteTableViewProps {
  banknotes: Banknote[]
  selectedBanknotes: string[]
  onSelectBanknote: (id: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  isAllSelected: boolean
  sortConfig: SortConfig
  onSort: (key: SortConfig["key"]) => void
  columnVisibility: Record<string, boolean>
  onQuickView: (banknote: Banknote) => void
  onDelete: (id: string) => void
}

export function BanknoteTableView({
  banknotes,
  selectedBanknotes,
  onSelectBanknote,
  onSelectAll,
  isAllSelected,
  sortConfig,
  onSort,
  columnVisibility,
  onQuickView,
  onDelete,
}: BanknoteTableViewProps) {
  const renderSortIndicator = (key: SortConfig["key"]) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 ml-1" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 ml-1" />
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox checked={isAllSelected} onCheckedChange={onSelectAll} aria-label="Select all" />
            </TableHead>
            <TableHead className="w-16">Image</TableHead>
            {columnVisibility.code && (
              <TableHead>
                <button onClick={() => onSort("code")} className="flex items-center font-medium hover:text-primary">
                  Code {renderSortIndicator("code")}
                </button>
              </TableHead>
            )}
            {columnVisibility.denomination && (
              <TableHead>
                <button
                  onClick={() => onSort("denomination")}
                  className="flex items-center font-medium hover:text-primary"
                >
                  Denomination {renderSortIndicator("denomination")}
                </button>
              </TableHead>
            )}
            {columnVisibility.currency && (
              <TableHead>
                <button onClick={() => onSort("currency")} className="flex items-center font-medium hover:text-primary">
                  Currency {renderSortIndicator("currency")}
                </button>
              </TableHead>
            )}
            {columnVisibility.year && (
              <TableHead>
                <button onClick={() => onSort("year")} className="flex items-center font-medium hover:text-primary">
                  Year {renderSortIndicator("year")}
                </button>
              </TableHead>
            )}
            {columnVisibility.material && (
              <TableHead>
                <button onClick={() => onSort("material")} className="flex items-center font-medium hover:text-primary">
                  Material {renderSortIndicator("material")}
                </button>
              </TableHead>
            )}
            {columnVisibility.grade && (
              <TableHead>
                <button onClick={() => onSort("grade")} className="flex items-center font-medium hover:text-primary">
                  Grade {renderSortIndicator("grade")}
                </button>
              </TableHead>
            )}
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {banknotes.map((banknote) => (
            <TableRow key={banknote.banknoteid}>
              <TableCell>
                <Checkbox
                  checked={selectedBanknotes.includes(banknote.banknoteid)}
                  onCheckedChange={(checked) => onSelectBanknote(banknote.banknoteid, !!checked)}
                />
              </TableCell>
              <TableCell>
                <div
                  className="relative w-12 h-6 bg-muted rounded overflow-hidden cursor-pointer"
                  onClick={() => onQuickView(banknote)}
                >
                  {banknote.front_thumbnail ? (
                    <img
                      src={banknote.front_thumbnail}
                      alt={banknote.code}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                      No img
                    </div>
                  )}
                </div>
              </TableCell>
              {columnVisibility.code && <TableCell>{banknote.code}</TableCell>}
              {columnVisibility.denomination && <TableCell>{banknote.denomination}</TableCell>}
              {columnVisibility.currency && <TableCell>{banknote.currencies?.code}</TableCell>}
              {columnVisibility.year && <TableCell>{banknote.year}</TableCell>}
              {columnVisibility.material && <TableCell>{banknote.material}</TableCell>}
              {columnVisibility.grade && <TableCell>{banknote.grade}</TableCell>}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onQuickView(banknote)}>Quick View</DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/banknotes/${banknote.banknoteid}`}>View Details</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/banknotes/${banknote.banknoteid}/edit`}>Edit</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(banknote.banknoteid)} className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
