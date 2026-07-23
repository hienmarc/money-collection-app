import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Award, Trophy, DollarSign, Calendar, Ruler } from 'lucide-react'

interface Banknote {
  banknoteid: number
  code?: string
  denomination?: number
  year?: number
  width?: number
  height?: number
  currencies?: {
    code?: string
    name?: string
  }
}

interface RankingsData {
  highestDenomination: Banknote[]
  lowestDenomination: Banknote[]
  oldestBanknotes: Banknote[]
  newestBanknotes: Banknote[]
  largestBanknotes: Banknote[]
  smallestBanknotes: Banknote[]
  widestBanknotes: Banknote[]
  tallestBanknotes: Banknote[]
}

interface BanknoteRankingsProps {
  rankings: RankingsData
}

export function BanknoteRankings({ rankings }: BanknoteRankingsProps) {
  // Helper function to format banknote display text
  const formatBanknoteText = (banknote: Banknote) => {
    const denomination = banknote.denomination || 'N/A';
    const currencyName = banknote.currencies?.name || 'Unknown';
    const year = banknote.year || 'N/A';
    
    return `${denomination} ${currencyName} (${year})`;
  };

  const formatDimensionsText = (banknote: Banknote) => {
    if (banknote.width && banknote.height) {
      return `${banknote.width} × ${banknote.height} mm (${(banknote.width * banknote.height).toFixed(0)} mm²)`;
    }
    return "N/A";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Banknote Rankings
        </CardTitle>
        <CardDescription>Notable banknotes in your collection based on various properties</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="value">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="value">Value</TabsTrigger>
            <TabsTrigger value="age">Age</TabsTrigger>
            <TabsTrigger value="size">Size</TabsTrigger>
            <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          </TabsList>

          <TabsContent value="value" className="pt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-medium flex items-center mb-3">
                  <Award className="h-5 w-5 mr-2 text-amber-500" />
                  Highest Denomination
                </h3>
                <div className="space-y-3">
                  {rankings.highestDenomination.length > 0 ? (
                    rankings.highestDenomination.slice(0, 5).map((banknote, index) => (
                      <Link href={`/banknotes/${banknote.banknoteid}`} key={banknote.banknoteid}>
                        <div className="flex items-center p-2 rounded-md hover:bg-muted transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold mr-3">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{formatBanknoteText(banknote)}</p>
                            <p className="text-xs text-muted-foreground">
                              Value: {banknote.denomination} {banknote.currencies?.code || ""}
                            </p>
                          </div>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium flex items-center mb-3">
                  <Award className="h-5 w-5 mr-2 text-blue-500" />
                  Lowest Denomination
                </h3>
                <div className="space-y-3">
                  {rankings.lowestDenomination.length > 0 ? (
                    rankings.lowestDenomination.slice(0, 5).map((banknote, index) => (
                      <Link href={`/banknotes/${banknote.banknoteid}`} key={banknote.banknoteid}>
                        <div className="flex items-center p-2 rounded-md hover:bg-muted transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold mr-3">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{formatBanknoteText(banknote)}</p>
                            <p className="text-xs text-muted-foreground">
                              Value: {banknote.denomination} {banknote.currencies?.code || ""}
                            </p>
                          </div>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="age" className="pt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-medium flex items-center mb-3">
                  <Award className="h-5 w-5 mr-2 text-amber-500" />
                  Oldest Banknotes
                </h3>
                <div className="space-y-3">
                  {rankings.oldestBanknotes.length > 0 ? (
                    rankings.oldestBanknotes.slice(0, 5).map((banknote, index) => (
                      <Link href={`/banknotes/${banknote.banknoteid}`} key={banknote.banknoteid}>
                        <div className="flex items-center p-2 rounded-md hover:bg-muted transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold mr-3">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{formatBanknoteText(banknote)}</p>
                            <p className="text-xs text-muted-foreground">Year: {banknote.year}</p>
                          </div>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium flex items-center mb-3">
                  <Award className="h-5 w-5 mr-2 text-blue-500" />
                  Newest Banknotes
                </h3>
                <div className="space-y-3">
                  {rankings.newestBanknotes.length > 0 ? (
                    rankings.newestBanknotes.slice(0, 5).map((banknote, index) => (
                      <Link href={`/banknotes/${banknote.banknoteid}`} key={banknote.banknoteid}>
                        <div className="flex items-center p-2 rounded-md hover:bg-muted transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold mr-3">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{formatBanknoteText(banknote)}</p>
                            <p className="text-xs text-muted-foreground">Year: {banknote.year}</p>
                          </div>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="size" className="pt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-medium flex items-center mb-3">
                  <Award className="h-5 w-5 mr-2 text-amber-500" />
                  Largest Banknotes
                </h3>
                <div className="space-y-3">
                  {rankings.largestBanknotes.length > 0 ? (
                    rankings.largestBanknotes.slice(0, 5).map((banknote, index) => (
                      <Link href={`/banknotes/${banknote.banknoteid}`} key={banknote.banknoteid}>
                        <div className="flex items-center p-2 rounded-md hover:bg-muted transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold mr-3">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{formatBanknoteText(banknote)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDimensionsText(banknote)}
                            </p>
                          </div>
                          <Ruler className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium flex items-center mb-3">
                  <Award className="h-5 w-5 mr-2 text-blue-500" />
                  Smallest Banknotes
                </h3>
                <div className="space-y-3">
                  {rankings.smallestBanknotes.length > 0 ? (
                    rankings.smallestBanknotes.slice(0, 5).map((banknote, index) => (
                      <Link href={`/banknotes/${banknote.banknoteid}`} key={banknote.banknoteid}>
                        <div className="flex items-center p-2 rounded-md hover:bg-muted transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold mr-3">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{formatBanknoteText(banknote)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDimensionsText(banknote)}
                            </p>
                          </div>
                          <Ruler className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dimensions" className="pt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-medium flex items-center mb-3">
                  <Award className="h-5 w-5 mr-2 text-amber-500" />
                  Widest Banknotes
                </h3>
                <div className="space-y-3">
                  {rankings.widestBanknotes.length > 0 ? (
                    rankings.widestBanknotes.slice(0, 5).map((banknote, index) => (
                      <Link href={`/banknotes/${banknote.banknoteid}`} key={banknote.banknoteid}>
                        <div className="flex items-center p-2 rounded-md hover:bg-muted transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold mr-3">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{formatBanknoteText(banknote)}</p>
                            <p className="text-xs text-muted-foreground">Width: {banknote.width} mm</p>
                          </div>
                          <Ruler className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium flex items-center mb-3">
                  <Award className="h-5 w-5 mr-2 text-blue-500" />
                  Tallest Banknotes
                </h3>
                <div className="space-y-3">
                  {rankings.tallestBanknotes.length > 0 ? (
                    rankings.tallestBanknotes.slice(0, 5).map((banknote, index) => (
                      <Link href={`/banknotes/${banknote.banknoteid}`} key={banknote.banknoteid}>
                        <div className="flex items-center p-2 rounded-md hover:bg-muted transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold mr-3">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{formatBanknoteText(banknote)}</p>
                            <p className="text-xs text-muted-foreground">Height: {banknote.height} mm</p>
                          </div>
                          <Ruler className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
