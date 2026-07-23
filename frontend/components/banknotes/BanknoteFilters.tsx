import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Filter, X } from "lucide-react"
import { Currency, StorageUnit, BanknoteFilters } from "@/lib/types"

interface BanknoteFiltersProps {
  filters: BanknoteFilters
  onFilterChange: (key: string, value: string) => void
  onClearFilters: () => void
  currencies: Currency[]
  years: number[]
  materials: string[]
  storageUnits: StorageUnit[]
  activeFiltersCount: number
  filteredCount: number
  totalCount: number
}

export function BanknoteFilterSection({
  filters,
  onFilterChange,
  onClearFilters,
  currencies,
  years,
  materials,
  storageUnits,
  activeFiltersCount,
  filteredCount,
  totalCount,
}: BanknoteFiltersProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex-shrink-0">
          <Filter className="h-4 w-4 mr-1" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1 py-0 h-5">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filters</h4>
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-8 px-2 text-xs">
              Clear All
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-20rem)] max-h-80">
          <div className="p-4 pt-2 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Currency</label>
              <Select value={filters.currency} onValueChange={(value) => onFilterChange("currency", value)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All currencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All currencies</SelectItem>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.currencyid} value={currency.currencyid.toString()}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Year</label>
              <Select value={filters.year} onValueChange={(value) => onFilterChange("year", value)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Material</label>
              <Select value={filters.material} onValueChange={(value) => onFilterChange("material", value)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All materials" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All materials</SelectItem>
                  {materials.map((material) => (
                    <SelectItem key={material} value={material}>
                      {material}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Grade</label>
              <Select value={filters.grade} onValueChange={(value) => onFilterChange("grade", value)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All grades</SelectItem>
                  <SelectItem value="G">G</SelectItem>
                  <SelectItem value="VG">VG</SelectItem>
                  <SelectItem value="F">F</SelectItem>
                  <SelectItem value="VF">VF</SelectItem>
                  <SelectItem value="XF">XF</SelectItem>
                  <SelectItem value="AU">AU</SelectItem>
                  <SelectItem value="UNC">UNC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Denomination Range</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.denomination.min}
                    onChange={(e) => onFilterChange("denomination.min", e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.denomination.max}
                    onChange={(e) => onFilterChange("denomination.max", e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-xs text-muted-foreground">
            {filteredCount} of {totalCount} banknotes
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
