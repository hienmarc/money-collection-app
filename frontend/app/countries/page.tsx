"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import {
  List,
  Grid,
  Map,
  Loader2,
  Search,
  Download,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useCountries } from "@/hooks/use-countries"

// Types
interface Country {
  countryid: number
  name: string
  code: string
  flagUrl?: string
  continent?: string
  selected?: boolean
}

interface SortConfig {
  key: string
  direction: "asc" | "desc"
}

export default function CountriesPage() {
  const { countries = [], isLoading, refreshCountries, deleteCountry, isRefetching } = useCountries()

  // State
  const [viewMode, setViewMode] = useState("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [continentFilter, setContinentFilter] = useState("all")
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" })
  const [selectedCountries, setSelectedCountries] = useState<number[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [countryToDelete, setCountryToDelete] = useState<number | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)

  const router = useRouter()
  const supabase = createClient()

  // Available continents for filtering
  const continents = useMemo(() => {
    const continentSet = new Set<string>()
    countries.forEach((country) => {
      if (country.continent) continentSet.add(country.continent)
    })
    return Array.from(continentSet).sort()
  }, [countries])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, continentFilter, sortConfig])

  // Apply filters and sorting
  const filteredCountries = useMemo(() => {
    let result = [...countries]

    // Apply search filter
    if (searchTerm) {
      result = result.filter(
        (country) =>
          country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          country.code.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Apply continent filter
    if (continentFilter !== "all") {
      result = result.filter((country) => country.continent === continentFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Country] || ""
      const bValue = b[sortConfig.key as keyof Country] || ""

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1
      }
      return 0
    })

    return result
  }, [countries, searchTerm, continentFilter, sortConfig])

  // Pagination
  const totalPages = Math.ceil(filteredCountries.length / itemsPerPage)
  const paginatedCountries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredCountries.slice(start, end)
  }, [filteredCountries, currentPage, itemsPerPage])

  // Bulk delete selected countries
  async function bulkDeleteCountries() {
    try {
      // Use Promise.all to delete all selected countries in parallel
      await Promise.all(selectedCountries.map((id) => supabase.from("countries").delete().eq("countryid", id)))

      toast({
        title: "Success",
        description: `${selectedCountries.length} countries deleted successfully.`,
      })

      // Clear selection and refresh list
      setSelectedCountries([])
      setBulkDeleteDialogOpen(false)
      refreshCountries()
    } catch (error) {
      console.error("Error in bulkDeleteCountries:", error)
      toast({
        title: "Error",
        description: "Failed to delete some countries. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Toggle country selection
  const toggleCountrySelection = (countryId: number) => {
    setSelectedCountries((prev) => {
      if (prev.includes(countryId)) {
        return prev.filter((id) => id !== countryId)
      } else {
        return [...prev, countryId]
      }
    })
  }

  // Toggle all countries selection
  const toggleAllSelection = () => {
    if (selectedCountries.length === paginatedCountries.length) {
      setSelectedCountries([])
    } else {
      setSelectedCountries(paginatedCountries.map((country) => country.countryid))
    }
  }

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  // Export to CSV
  const exportToCSV = () => {
    // Create CSV content
    const headers = ["ID", "Name", "Code", "Continent"]
    const csvContent = [
      headers.join(","),
      ...filteredCountries.map((country) =>
        [
          country.countryid,
          `"${country.name.replace(/"/g, '""')}"`, // Escape quotes in CSV
          country.code,
          `"${(country.continent || "Unknown").replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ].join("\n")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `countries_export_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export Complete",
      description: `${filteredCountries.length} countries exported to CSV.`,
    })
  }

  // Render view toggle buttons
  const renderViewToggle = () => (
    <div className="flex space-x-1">
      <Button
        variant={viewMode === "list" ? "default" : "outline"}
        size="icon"
        onClick={() => setViewMode("list")}
        title="List view"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "grid" ? "default" : "outline"}
        size="icon"
        onClick={() => setViewMode("grid")}
        title="Grid view"
      >
        <Grid className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "map" ? "default" : "outline"}
        size="icon"
        onClick={() => setViewMode("map")}
        title="Map view"
      >
        <Map className="h-4 w-4" />
      </Button>
    </div>
  )

  // Render table view
  const renderListView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={paginatedCountries.length > 0 && selectedCountries.length === paginatedCountries.length}
                onCheckedChange={toggleAllSelection}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
              <div className="flex items-center space-x-1">
                <span>Name</span>
                {sortConfig.key === "name" && (
                  <ArrowUpDown className={`h-4 w-4 ${sortConfig.direction === "desc" ? "transform rotate-180" : ""}`} />
                )}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("code")}>
              <div className="flex items-center space-x-1">
                <span>Code</span>
                {sortConfig.key === "code" && (
                  <ArrowUpDown className={`h-4 w-4 ${sortConfig.direction === "desc" ? "transform rotate-180" : ""}`} />
                )}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("continent")}>
              <div className="flex items-center space-x-1">
                <span>Continent</span>
                {sortConfig.key === "continent" && (
                  <ArrowUpDown className={`h-4 w-4 ${sortConfig.direction === "desc" ? "transform rotate-180" : ""}`} />
                )}
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedCountries.length > 0 ? (
            paginatedCountries.map((country) => (
              <TableRow key={country.countryid}>
                <TableCell>
                  <Checkbox
                    checked={selectedCountries.includes(country.countryid)}
                    onCheckedChange={() => toggleCountrySelection(country.countryid)}
                    aria-label={`Select ${country.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {country.flagUrl && (
                      <img
                        src={country.flagUrl || "/placeholder.svg"}
                        alt={`Flag of ${country.name}`}
                        className="h-5 w-8 object-cover rounded-sm"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = "none"
                        }}
                      />
                    )}
                    <Link href={`/countries/${country.countryid}`} className="font-medium hover:underline">
                      {country.name}
                    </Link>
                  </div>
                </TableCell>
                <TableCell>{country.code}</TableCell>
                <TableCell>{country.continent && <Badge variant="outline">{country.continent}</Badge>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                    <Link href={`/countries/${country.countryid}/edit`}>
                      <Button variant="ghost" size="icon" title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCountryToDelete(country.countryid)
                        setIsDeleteDialogOpen(true)
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No countries found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )

  // Render grid view
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {paginatedCountries.length > 0 ? (
        paginatedCountries.map((country) => (
          <Link href={`/countries/${country.countryid}`} key={country.countryid} className="block">
            <Card className="overflow-hidden h-full transition-all hover:border-primary hover:shadow-md">
              <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg font-semibold">{country.name}</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline">{country.code}</Badge>
                    {country.continent && <Badge variant="secondary">{country.continent}</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {country.flagUrl && (
                  <div className="relative h-32 w-full">
                    <img
                      src={country.flagUrl || "/placeholder.svg"}
                      alt={`Flag of ${country.name}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = "none"
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))
      ) : (
        <div className="col-span-full flex justify-center items-center h-32 text-muted-foreground">
          No countries found.
        </div>
      )}
    </div>
  )

  // Render pagination
  const renderPagination = () => {
    if (filteredCountries.length <= itemsPerPage) return null

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>

          {/* First page */}
          {currentPage > 2 && (
            <PaginationItem>
              <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
            </PaginationItem>
          )}

          {/* Ellipsis */}
          {currentPage > 3 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {/* Previous page */}
          {currentPage > 1 && (
            <PaginationItem>
              <PaginationLink onClick={() => setCurrentPage(currentPage - 1)}>{currentPage - 1}</PaginationLink>
            </PaginationItem>
          )}

          {/* Current page */}
          <PaginationItem>
            <PaginationLink isActive>{currentPage}</PaginationLink>
          </PaginationItem>

          {/* Next page */}
          {currentPage < totalPages && (
            <PaginationItem>
              <PaginationLink onClick={() => setCurrentPage(currentPage + 1)}>{currentPage + 1}</PaginationLink>
            </PaginationItem>
          )}

          {/* Ellipsis */}
          {currentPage < totalPages - 2 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {/* Last page */}
          {currentPage < totalPages - 1 && (
            <PaginationItem>
              <PaginationLink onClick={() => setCurrentPage(totalPages)}>{totalPages}</PaginationLink>
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Countries</h1>
          <p className="text-muted-foreground">Manage countries in your collection</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => refreshCountries()} disabled={isRefetching} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/countries/new">
            <Button>Add New Country</Button>
          </Link>
        </div>
      </div>

      {/* Filters and actions */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search countries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={continentFilter} onValueChange={setContinentFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by continent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All continents</SelectItem>
              {continents.map((continent) => (
                <SelectItem key={continent} value={continent}>
                  {continent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
            <SelectTrigger className="w-full sm:w-[110px]">
              <SelectValue placeholder="Per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 per page</SelectItem>
              <SelectItem value="24">24 per page</SelectItem>
              <SelectItem value="48">48 per page</SelectItem>
              <SelectItem value="96">96 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {renderViewToggle()}

          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={selectedCountries.length === 0}>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setBulkDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedCountries.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="icon" onClick={exportToCSV} title="Export to CSV">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active filters */}
      {(searchTerm || continentFilter !== "all") && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <span>Search: {searchTerm}</span>
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchTerm("")} />
            </Badge>
          )}
          {continentFilter !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <span>Continent: {continentFilter}</span>
              <X className="h-3 w-3 cursor-pointer" onClick={() => setContinentFilter("all")} />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => {
              setSearchTerm("")
              setContinentFilter("all")
            }}
          >
            Clear all filters
          </Button>
        </div>
      )}

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        {isLoading ? (
          "Loading countries..."
        ) : (
          <>
            Showing {paginatedCountries.length} of {filteredCountries.length} countries
            {filteredCountries.length !== countries.length && <> (filtered from {countries.length} total)</>}
          </>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {viewMode === "list" && renderListView()}
          {viewMode === "grid" && renderGridView()}
        </>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center mt-4">{renderPagination()}</div>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Country</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this country? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (countryToDelete !== null) {
                  deleteCountry(countryToDelete)
                  setSelectedCountries((prev) => prev.filter((id) => id !== countryToDelete))
                  setIsDeleteDialogOpen(false)
                  setCountryToDelete(null)
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Multiple Countries</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCountries.length} countries? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={bulkDeleteCountries}>
              Delete {selectedCountries.length} Countries
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}