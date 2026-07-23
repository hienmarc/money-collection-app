"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useBanknotes } from "@/hooks/use-banknotes"
import { useExchangeRates } from "@/hooks/use-currencies"

export default function CollectionValuePage() {
  const { banknotes, isLoading: isLoadingBanknotes } = useBanknotes()
  const { data: exchangeRates = {}, isLoading: isLoadingRates, isError } = useExchangeRates()
  const [selectedCurrency, setSelectedCurrency] = useState("CAD")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const isLoading = isLoadingBanknotes || isLoadingRates

  function calculateValue(banknote: any, targetCurrency: string): number | null {
    const eurRate = (exchangeRates as any)[banknote.currencies?.code]
    if (!eurRate) return null
    const eurValue = banknote.denomination / eurRate
    if (targetCurrency === "EUR") return eurValue
    const targetRate = (exchangeRates as any)[targetCurrency]
    if (!targetRate) return null
    return eurValue * targetRate
  }

  const sortedBanknotes = [...banknotes].sort((a, b) => {
    const vA = calculateValue(a, selectedCurrency) || 0
    const vB = calculateValue(b, selectedCurrency) || 0
    return sortOrder === "asc" ? vA - vB : vB - vA
  })

  const totalValue = banknotes.reduce((sum, b) => sum + (calculateValue(b, selectedCurrency) || 0), 0)
  const availableCurrencies = Object.keys(exchangeRates).sort()

  if (isError) {
    return <div className="p-6 text-red-500">Failed to load exchange rates.</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Collection Value</h1>
      {isLoading ? <div className="flex justify-center h-64 items-center"><Loader2 className="animate-spin h-8 w-8" /></div> : (
        <>
          <Card>
            <CardHeader><CardTitle className="flex justify-between items-center"><span>Total Value</span>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{availableCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select></CardTitle>
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{totalValue.toFixed(2)} {selectedCurrency}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex justify-between items-center"><span>Banknote Values</span>
              <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="text-sm underline text-primary">Sort: {sortOrder}</button></CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Denomination</TableHead><TableHead>Currency</TableHead><TableHead>Value ({selectedCurrency})</TableHead></TableRow></TableHeader>
                <TableBody>{sortedBanknotes.map(b => (
                  <TableRow key={b.banknoteid}><TableCell>{b.code}</TableCell><TableCell>{b.denomination}</TableCell><TableCell>{b.currencies?.code}</TableCell><TableCell>{calculateValue(b, selectedCurrency)?.toFixed(2) || "N/A"}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
