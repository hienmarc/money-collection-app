"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Loader2,
  Download,
  Grid,
  List,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { useCurrencies, useExchangeRates, CurrencyWithCountries } from "@/hooks/use-currencies"

export default function CurrenciesPage() {
  const { currencies, isLoading, isRefetching, refreshCurrencies, deleteCurrency, bulkDeleteCurrencies } = useCurrencies()
  const { data: exchangeRates = {}, isLoading: isLoadingRates, refetch: refreshRates } = useExchangeRates()

  const [viewMode, setViewMode] = useState("table")
  const [selectedCurrencies, setSelectedCurrencies] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState("name")
  const [sortDirection, setSortDirection] = useState("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [filters, setFilters] = useState<any>({})
  const [quickViewCurrency, setQuickViewCurrency] = useState<CurrencyWithCountries | null>(null)
  const [baseCurrency, setBaseCurrency] = useState("CAD")
  const router = useRouter()

  const getExchangeRate = (currencyCode: string) => {
    if (!currencyCode || !exchangeRates || Object.keys(exchangeRates).length === 0) return null
    if (baseCurrency === currencyCode) return 1
    if (baseCurrency === "EUR") return exchangeRates[currencyCode] || null
    const baseRate = (exchangeRates as any)[baseCurrency]
    const targetRate = (exchangeRates as any)[currencyCode]
    if (!baseRate || !targetRate) return null
    return targetRate / baseRate
  }

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDirection("asc"); }
  }

  const filteredCurrencies = useMemo(() => {
    let result = [...currencies]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.countries.some(country => country.toLowerCase().includes(q)))
    }
    if (filters.hasExchangeRate) {
      if (filters.hasExchangeRate === "yes") result = result.filter(c => getExchangeRate(c.code) !== null)
      else if (filters.hasExchangeRate === "no") result = result.filter(c => getExchangeRate(c.code) === null)
    }
    result.sort((a: any, b: any) => {
      let aVal = a[sortField]; let bVal = b[sortField]
      if (sortField === "countries") { aVal = a.countries.join(", "); bVal = b.countries.join(", "); }
      if (sortField === "exchangeRate") { aVal = getExchangeRate(a.code) || 0; bVal = getExchangeRate(b.code) || 0; }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
    return result
  }, [currencies, searchQuery, filters, sortField, sortDirection, exchangeRates, baseCurrency])

  const paginatedCurrencies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredCurrencies.slice(start, start + itemsPerPage)
  }, [filteredCurrencies, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredCurrencies.length / itemsPerPage)

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedCurrencies(paginatedCurrencies.map(c => c.currencyid))
    else setSelectedCurrencies([])
  }

  const handleSelectCurrency = (id: number, checked: boolean) => {
    if (checked) setSelectedCurrencies([...selectedCurrencies, id])
    else setSelectedCurrencies(selectedCurrencies.filter(sid => sid !== id))
  }

  const exportToCSV = () => {
    try {
      const data = filteredCurrencies.map(c => ({
        Name: c.name, Code: c.code, Symbol: c.symbol, Subunit: c.subunit, Countries: c.countries.join(", "),
        "Exchange Rate": getExchangeRate(c.code) ? `1 ${baseCurrency} = ${getExchangeRate(c.code)!.toFixed(4)} ${c.code}` : "N/A"
      }))
      const headers = Object.keys(data[0]).join(",")
      const rows = data.map(obj => Object.values(obj).map(v => typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v).join(","))
      const csv = [headers, ...rows].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url); link.setAttribute("download", `currencies_export.csv`); link.click()
      toast({ title: "Success", description: "Exported successfully." })
    } catch (e) { toast({ title: "Error", description: "Export failed.", variant: "destructive" }) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">Currencies</h1>
        <Link href="/currencies/new"><Button><Plus className="mr-2 h-4 w-4" />Add Currency</Button></Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search currencies..." className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal className="h-4 w-4 mr-2" />Filters
                {Object.values(filters).filter(v => v && v !== "all").length > 0 && <Badge variant="secondary" className="ml-1">{Object.values(filters).filter(v => v && v !== "all").length}</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2">
                <p className="text-sm font-medium mb-1">Has Exchange Rate</p>
                <Select value={filters.hasExchangeRate || "all"} onValueChange={v => setFilters({ ...filters, hasExchangeRate: v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setFilters({})}>Clear</Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("grid")}><Grid className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Base:</span>
        <Select value={baseCurrency} onValueChange={setBaseCurrency}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup><SelectLabel>Common</SelectLabel><SelectItem value="CAD">CAD</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectGroup>
            <SelectGroup><SelectLabel>Others</SelectLabel>{currencies.filter(c => !["CAD", "USD", "EUR"].includes(c.code)).map(c => <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>)}</SelectGroup>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refreshRates()} disabled={isLoadingRates}><RefreshCw className={`h-4 w-4 ${isLoadingRates ? "animate-spin" : ""}`} /></Button>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div> : (
        <>
          {viewMode === "table" ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><Checkbox checked={paginatedCurrencies.length > 0 && paginatedCurrencies.every(c => selectedCurrencies.includes(c.currencyid))} onCheckedChange={handleSelectAll} /></TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>Name {sortField === "name" && (sortDirection === "asc" ? <ArrowUp className="inline h-4 w-4" /> : <ArrowDown className="inline h-4 w-4" />)}</TableHead>
                    <TableHead onClick={() => handleSort("code")}>Code</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Countries</TableHead>
                    <TableHead onClick={() => handleSort("exchangeRate")}>Rate (1 {baseCurrency} =)</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCurrencies.map(c => (
                    <TableRow key={c.currencyid}>
                      <TableCell><Checkbox checked={selectedCurrencies.includes(c.currencyid)} onCheckedChange={checked => handleSelectCurrency(c.currencyid, !!checked)} /></TableCell>
                      <TableCell><Link href={`/currencies/${c.currencyid}`} className="hover:underline font-medium">{c.name}</Link></TableCell>
                      <TableCell>{c.code}</TableCell>
                      <TableCell>{c.symbol || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{c.countries.join(", ")}</TableCell>
                      <TableCell>{getExchangeRate(c.code)?.toFixed(4) || "N/A"} {c.code}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setQuickViewCurrency(c)}>Quick View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/currencies/${c.currencyid}/edit`)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => deleteCurrency(c.currencyid)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedCurrencies.map(c => (
                <Card key={c.currencyid}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div><h3 className="font-medium underline"><Link href={`/currencies/${c.currencyid}`}>{c.name}</Link></h3><p className="text-sm text-muted-foreground">{c.code} {c.symbol && `(${c.symbol})`}</p></div>
                      <Checkbox checked={selectedCurrencies.includes(c.currencyid)} onCheckedChange={checked => handleSelectCurrency(c.currencyid, !!checked)} />
                    </div>
                    <div className="mt-4 text-sm space-y-1">
                      <div className="flex justify-between"><span>Rate:</span><span>{getExchangeRate(c.code)?.toFixed(4) || "N/A"}</span></div>
                      <div className="flex justify-between"><span>Countries:</span><span className="truncate max-w-[100px]">{c.countries.join(", ")}</span></div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-2 bg-muted/50 flex justify-between">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/currencies/${c.currencyid}/edit`)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteCurrency(c.currencyid)}>Delete</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              <Select value={itemsPerPage.toString()} onValueChange={v => setItemsPerPage(Number(v))}><SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronDown className="h-4 w-4 rotate-90" /></Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronDown className="h-4 w-4 -rotate-90" /></Button>
              <span className="flex items-center px-4 text-sm">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronDown className="h-4 w-4 rotate-90" /></Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronDown className="h-4 w-4 -rotate-90" /></Button>
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV}><Download className="h-4 w-4 mr-2" />Export</Button>
          </div>
        </>
      )}

      <Dialog open={!!quickViewCurrency} onOpenChange={v => !v && setQuickViewCurrency(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{quickViewCurrency?.name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div><p className="text-sm font-medium">Code</p><p>{quickViewCurrency?.code}</p></div>
            <div><p className="text-sm font-medium">Symbol</p><p>{quickViewCurrency?.symbol || "-"}</p></div>
            <div className="col-span-2"><p className="text-sm font-medium">Rate</p><p>1 {baseCurrency} = {getExchangeRate(quickViewCurrency?.code || "")?.toFixed(4)} {quickViewCurrency?.code}</p></div>
          </div>
          <DialogFooter><Button onClick={() => setQuickViewCurrency(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
