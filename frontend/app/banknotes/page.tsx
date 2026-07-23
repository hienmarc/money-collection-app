"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Download,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useBanknotes } from "@/hooks/use-banknotes"
import { BanknoteFilterSection } from "@/components/banknotes/BanknoteFilters"
import { BanknoteTableView } from "@/components/banknotes/BanknoteTableView"
import { BanknoteGridView } from "@/components/banknotes/BanknoteGridView"
import { BanknoteQuickView } from "@/components/banknotes/BanknoteQuickView"
import { Banknote } from "@/lib/types"

export default function BanknotesPage() {
  const {
    banknotes,
    filteredBanknotes,
    currentBanknotes,
    currencies,
    storageUnits,
    materials,
    years,
    isLoading,
    isRefreshing,
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
    refreshData,
    deleteBanknote,
    bulkDeleteBanknotes,
    ITEMS_PER_PAGE,
  } = useBanknotes()

  const [view, setView] = useState("grid")
  const [selectedBanknotes, setSelectedBanknotes] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [banknoteToDelete, setBanknoteToDelete] = useState<string | null>(null)
  const [quickViewBanknote, setQuickViewBanknote] = useState<Banknote | null>(null)
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState({
    code: true,
    denomination: true,
    currency: true,
    year: true,
    material: true,
    grade: true,
  })

  const handleDeleteBanknote = async () => {
    if (!banknoteToDelete) return
    deleteBanknote(banknoteToDelete, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        setBanknoteToDelete(null)
      },
    })
  }

  const handleBulkDelete = async () => {
    bulkDeleteBanknotes(selectedBanknotes, {
      onSuccess: () => {
        setSelectedBanknotes([])
      },
    })
  }

  const handleExportCSV = () => {
    const headers = ["ID", "Code", "Denomination", "Currency Code", "Year", "Material", "Grade"]
    const rows = filteredBanknotes.map((b) => [
      b.banknoteid,
      b.code,
      b.denomination,
      b.currencies?.code,
      b.year,
      b.material,
      b.grade,
    ])
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c || ""}"`).join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `banknotes_export_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const activeFiltersCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (key === "denomination") {
      return count + (filters.denomination.min ? 1 : 0) + (filters.denomination.max ? 1 : 0)
    }
    return count + (value && value !== "all" ? 1 : 0)
  }, 0)

  const isAllSelected =
    currentBanknotes.length > 0 && currentBanknotes.every((b) => selectedBanknotes.includes(b.banknoteid))

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBanknotes(currentBanknotes.map((b) => b.banknoteid))
    } else {
      setSelectedBanknotes([])
    }
  }

  const handleSelectBanknote = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedBanknotes((prev) => [...prev, id])
    } else {
      setSelectedBanknotes((prev) => prev.filter((prevId) => prevId !== id))
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Banknotes</h1>
          <p className="text-sm text-muted-foreground">Manage and browse your banknote collection</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/banknotes/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Banknote
            </Button>
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search banknotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <BanknoteFilterSection
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              currencies={currencies}
              years={years}
              materials={materials}
              storageUnits={storageUnits}
              activeFiltersCount={activeFiltersCount}
              filteredCount={filteredBanknotes.length}
              totalCount={banknotes.length}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-shrink-0">
                  <SlidersHorizontal className="h-4 w-4 mr-1" />
                  View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setView("table")}>
                  <List className={`h-4 w-4 mr-2 ${view === "table" ? "text-primary" : ""}`} />
                  Table View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView("grid")}>
                  <LayoutGrid className={`h-4 w-4 mr-2 ${view === "grid" ? "text-primary" : ""}`} />
                  Grid View
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export to CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedBanknotes.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete ({selectedBanknotes.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredBanknotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/20 text-center">
          <h3 className="text-lg font-medium">No banknotes found</h3>
          <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters</p>
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <>
          {view === "table" ? (
            <BanknoteTableView
              banknotes={currentBanknotes}
              selectedBanknotes={selectedBanknotes}
              onSelectBanknote={handleSelectBanknote}
              onSelectAll={(checked) => handleSelectAll(!!checked)}
              isAllSelected={isAllSelected}
              sortConfig={sortConfig}
              onSort={handleSort}
              columnVisibility={columnVisibility}
              onQuickView={(b) => {
                setQuickViewBanknote(b)
                setQuickViewOpen(true)
              }}
              onDelete={(id) => {
                setBanknoteToDelete(id)
                setDeleteDialogOpen(true)
              }}
            />
          ) : (
            <BanknoteGridView
              banknotes={currentBanknotes}
              selectedBanknotes={selectedBanknotes}
              onSelectBanknote={handleSelectBanknote}
              onQuickView={(b) => {
                setQuickViewBanknote(b)
                setQuickViewOpen(true)
              }}
              onDelete={(id) => {
                setBanknoteToDelete(id)
                setDeleteDialogOpen(true)
              }}
            />
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredBanknotes.length)} of {filteredBanknotes.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <BanknoteQuickView banknote={quickViewBanknote} open={quickViewOpen} onOpenChange={setQuickViewOpen} />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Banknote</DialogTitle>
            <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBanknote}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
