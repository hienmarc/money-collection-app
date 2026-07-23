"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PieChart, BarChart, DoughnutChart } from "@/components/chart"
import { Loader2, TrendingUp, DollarSign, Calendar, Ruler } from "lucide-react"
import Link from "next/link"
import { BanknoteRankings } from "@/components/BanknoteRankings"
import { Badge } from "@/components/ui/badge"
import { useDashboardData } from "@/hooks/use-dashboard"

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState("all")
  const [currencyFilter, setCurrencyFilter] = useState("all")

  const {
    banknotes,
    currencies,
    isLoading,
    stats,
    rankings,
    banknoteOfTheDay,
    totalBanknotes,
    totalCurrencies,
    totalCountries,
  } = useDashboardData(timeRange, currencyFilter)

  // Prepare data for charts
  const prepareChartData = () => {
    // Currency distribution
    const currencyDistribution = banknotes.reduce((acc: Record<string, number>, banknote) => {
      if (banknote.currencies && banknote.currencies.code) {
        acc[banknote.currencies.code] = (acc[banknote.currencies.code] || 0) + 1
      }
      return acc
    }, {})

    const sortedCurrencies = Object.entries(currencyDistribution).sort((a, b) => b[1] - a[1])
    const top9Currencies = sortedCurrencies.slice(0, 9)
    const othersTotal = sortedCurrencies.slice(9).reduce((sum, [, count]) => sum + count, 0)

    const currencyChartData = top9Currencies.map(([name, value]) => ({ name, value }))
    if (othersTotal > 0) currencyChartData.push({ name: "Others", value: othersTotal })

    // Year distribution
    const yearDistribution = banknotes.reduce((acc: Record<number, number>, banknote) => {
      if (banknote.year) {
        acc[banknote.year] = (acc[banknote.year] || 0) + 1
      }
      return acc
    }, {})

    const yearChartData = Object.keys(yearDistribution)
      .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
      .map((year) => ({
        name: year,
        value: yearDistribution[Number.parseInt(year)],
      }))

    // Condition distribution
    const conditionDistribution = banknotes.reduce((acc: Record<string, number>, banknote) => {
      if (banknote.grade) {
        acc[banknote.grade] = (acc[banknote.grade] || 0) + 1
      }
      return acc
    }, {})

    // Material distribution
    const materialDistribution = banknotes.reduce((acc: Record<string, number>, banknote) => {
      const mat = banknote.material || "Unknown"
      acc[mat] = (acc[mat] || 0) + 1
      return acc
    }, {})

    // Size distribution
    const sizeDistribution = banknotes.reduce((acc: Record<string, number>, banknote) => {
      if (banknote.width && banknote.height) {
        const area = banknote.width * banknote.height
        const cat = area < 8000 ? "Small" : area < 12000 ? "Medium" : "Large"
        acc[cat] = (acc[cat] || 0) + 1
      }
      return acc
    }, {})

    // Value distribution
    const valueRanges = { "< 10": 0, "10-50": 0, "51-100": 0, "101-500": 0, "> 500": 0 }
    banknotes.forEach((banknote) => {
      const v = banknote.denomination || 0
      if (v < 10) valueRanges["< 10"]++
      else if (v <= 50) valueRanges["10-50"]++
      else if (v <= 100) valueRanges["51-100"]++
      else if (v <= 500) valueRanges["101-500"]++
      else valueRanges["> 500"]++
    })

    return {
      currencyChartData,
      yearChartData,
      conditionChartData: Object.entries(conditionDistribution).map(([name, value]) => ({ name, value })),
      materialChartData: Object.entries(materialDistribution).map(([name, value]) => ({ name, value })),
      sizeChartData: Object.entries(sizeDistribution).map(([name, value]) => ({ name, value })),
      valueChartData: Object.entries(valueRanges).map(([name, value]) => ({ name, value })),
    }
  }

  const chartData = isLoading ? ({} as any) : prepareChartData()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="5">Last 5 Years</SelectItem>
              <SelectItem value="10">Last 10 Years</SelectItem>
              <SelectItem value="20">Last 20 Years</SelectItem>
              <SelectItem value="50">Last 50 Years</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Currencies</SelectItem>
              {currencies.map((currency) => (
                <SelectItem key={currency.currencyid} value={currency.currencyid.toString()}>
                  {currency.code} - {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Key Statistics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Banknotes</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBanknotes}</div>
                <p className="text-xs text-muted-foreground">
                  From {totalCurrencies} currencies and {totalCountries} countries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Highest Denomination</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.mostValuableBanknote?.denomination || "N/A"}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.mostValuableBanknote?.currencies?.name || "Unknown"} banknote
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Year Range</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.oldestBanknote?.year || "N/A"} - {stats.newestBanknote?.year || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">Most common: {stats.mostCommonYear || "N/A"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Average Size</CardTitle>
                <Ruler className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.averageDimensions.width.toFixed(1)} × {stats.averageDimensions.height.toFixed(1)} mm
                </div>
                <p className="text-xs text-muted-foreground">Average dimensions of your banknotes</p>
              </CardContent>
            </Card>
          </div>

          {/* Banknote of the Day */}
          {banknoteOfTheDay && (
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Banknote of the Day
                </CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/banknotes/${banknoteOfTheDay.banknoteid}`}>
                  <div className="grid lg:grid-cols-3 gap-6 hover:bg-muted/50 transition-colors rounded-lg p-4 -m-4">
                    <div className="lg:col-span-2 grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground text-center">Front</div>
                        <div className="relative aspect-[5/3] overflow-hidden rounded-lg bg-muted border">
                          <img
                            src={banknoteOfTheDay.front_image || "/placeholder.svg?height=200&width=300"}
                            alt={`Front of ${banknoteOfTheDay.denomination} ${banknoteOfTheDay.currencies?.name || "Unknown"}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground text-center">Back</div>
                        <div className="relative aspect-[5/3] overflow-hidden rounded-lg bg-muted border">
                          <img
                            src={banknoteOfTheDay.back_image || "/placeholder.svg?height=200&width=300"}
                            alt={`Back of ${banknoteOfTheDay.denomination} ${banknoteOfTheDay.currencies?.name || "Unknown"}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold">
                          {banknoteOfTheDay.denomination} {banknoteOfTheDay.currencies?.name || "Unknown Currency"}
                        </h3>
                        <p className="text-lg text-muted-foreground">{banknoteOfTheDay.year || "Unknown Year"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-sm">
                          {banknoteOfTheDay.currencies?.code || "N/A"}
                        </Badge>
                        {banknoteOfTheDay.grade && (
                          <Badge variant="secondary" className="text-sm">
                            {banknoteOfTheDay.grade}
                          </Badge>
                        )}
                        {banknoteOfTheDay.material && (
                          <Badge variant="outline" className="text-sm">
                            {banknoteOfTheDay.material}
                          </Badge>
                        )}
                      </div>
                      {banknoteOfTheDay.width && banknoteOfTheDay.height && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Dimensions:</strong> {banknoteOfTheDay.width} × {banknoteOfTheDay.height} mm
                        </p>
                      )}
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground">Click to view full details →</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          <BanknoteRankings rankings={rankings} />

          <Tabs defaultValue="distribution">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="physical">Physical Properties</TabsTrigger>
              <TabsTrigger value="value">Denominations</TabsTrigger>
            </TabsList>

            <TabsContent value="distribution" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Banknotes by Currency</CardTitle>
                    <CardDescription>Top 10 currencies in your collection</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <PieChart data={chartData.currencyChartData || []} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Banknotes by Condition</CardTitle>
                    <CardDescription>Quality distribution of your collection</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <DoughnutChart data={chartData.conditionChartData || []} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Banknotes by Year of Issue</CardTitle>
                  <CardDescription>Historical distribution of your collection</CardDescription>
                </CardHeader> 
                <CardContent className="h-80">
                  <BarChart data={chartData.yearChartData || []} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
