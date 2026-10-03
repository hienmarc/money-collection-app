import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Banknote as BanknoteIcon, ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react"
import { Banknote, BanknoteGrade, SortConfig } from "@/lib/types"

const gradeBadgeColors: Record<BanknoteGrade, string> = {
  [BanknoteGrade.G]: "border-red-200 bg-red-50 text-red-700",
  [BanknoteGrade.VG]:
    "border-orange-200 bg-orange-50 text-orange-700",
  [BanknoteGrade.F]:
    "border-amber-200 bg-amber-50 text-amber-700",
  [BanknoteGrade.VF]:
    "border-lime-200 bg-lime-50 text-lime-700",
  [BanknoteGrade.XF]:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  [BanknoteGrade.AU]:
    "border-sky-200 bg-sky-50 text-sky-700",
  [BanknoteGrade.UNC]:
    "border-violet-200 bg-violet-50 text-violet-700",
}

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
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table className="min-w-[860px]">
        <TableHeader>
          <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-12 pl-5">
              <Checkbox checked={isAllSelected} onCheckedChange={onSelectAll} aria-label="Select all" />
            </TableHead>
            <TableHead className="w-20 text-[11px] font-semibold uppercase tracking-wider">Note</TableHead>
            {columnVisibility.code && (
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                <button onClick={() => onSort("code")} className="flex items-center transition-colors hover:text-primary">
                  Code {renderSortIndicator("code")}
                </button>
              </TableHead>
            )}
            {columnVisibility.denomination && (
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                <button
                  onClick={() => onSort("denomination")}
                  className="flex items-center transition-colors hover:text-primary"
                >
                  Denomination {renderSortIndicator("denomination")}
                </button>
              </TableHead>
            )}
            {columnVisibility.currency && (
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                <button onClick={() => onSort("currency")} className="flex items-center transition-colors hover:text-primary">
                  Currency {renderSortIndicator("currency")}
                </button>
              </TableHead>
            )}
            {columnVisibility.year && (
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                <button onClick={() => onSort("year")} className="flex items-center transition-colors hover:text-primary">
                  Year {renderSortIndicator("year")}
                </button>
              </TableHead>
            )}
            {columnVisibility.material && (
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                <button onClick={() => onSort("material")} className="flex items-center transition-colors hover:text-primary">
                  Material {renderSortIndicator("material")}
                </button>
              </TableHead>
            )}
            {columnVisibility.grade && (
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                <button onClick={() => onSort("grade")} className="flex items-center transition-colors hover:text-primary">
                  Grade {renderSortIndicator("grade")}
                </button>
              </TableHead>
            )}
            <TableHead className="w-[100px] pr-5 text-right text-[11px] font-semibold uppercase tracking-wider">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {banknotes.map((banknote) => {
            const isSelected = selectedBanknotes.includes(banknote.banknoteid)

            return (
              <TableRow
                key={banknote.banknoteid}
                data-state={isSelected ? "selected" : undefined}
                className="group border-b last:border-0 hover:bg-muted/40"
              >
                <TableCell className="py-3 pl-5">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectBanknote(banknote.banknoteid, !!checked)}
                    aria-label={`Select banknote ${banknote.code}`}
                  />
                </TableCell>
                <TableCell className="py-3">
                  <button
                    type="button"
                    aria-label={`Quick view banknote ${banknote.code}`}
                    className="relative flex h-10 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted/50 transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => onQuickView(banknote)}
                  >
                    {banknote.front_thumbnail ? (
                      <img
                        src={banknote.front_thumbnail}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground">
                        <BanknoteIcon className="h-4 w-4" />
                        <span className="text-[8px] font-medium uppercase tracking-wide">No image</span>
                      </div>
                    )}
                  </button>
                </TableCell>
                {columnVisibility.code && (
                  <TableCell className="py-3">
                    <Link
                      href={`/banknotes/${banknote.banknoteid}`}
                      className="inline-flex rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {banknote.code}
                    </Link>
                  </TableCell>
                )}
                {columnVisibility.denomination && (
                  <TableCell className="py-3 font-semibold tabular-nums">{banknote.denomination}</TableCell>
                )}
                {columnVisibility.currency && (
                  <TableCell className="py-3">
                    <span className="inline-flex rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {banknote.currencies?.code || "—"}
                    </span>
                  </TableCell>
                )}
                {columnVisibility.year && (
                  <TableCell className="py-3 font-medium tabular-nums">{banknote.year}</TableCell>
                )}
                {columnVisibility.material && (
                  <TableCell className="max-w-[180px] truncate py-3 text-sm text-muted-foreground">
                    {banknote.material || "—"}
                  </TableCell>
                )}
                {columnVisibility.grade && (
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={`min-w-12 justify-center font-semibold tracking-wide ${gradeBadgeColors[banknote.grade]}`}
                    >
                      {banknote.grade}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="py-3 pr-5 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground opacity-70 transition-opacity hover:text-foreground group-hover:opacity-100"
                        aria-label={`Actions for banknote ${banknote.code}`}
                      >
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
                      <DropdownMenuItem
                        onClick={() => onDelete(banknote.banknoteid)}
                        className="text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
