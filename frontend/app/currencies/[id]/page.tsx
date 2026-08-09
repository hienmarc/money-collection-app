"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

export default function CurrencyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const {id: currencyId} = use(params)
  const [currency, setCurrency] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchCurrency() {
      if (!currencyId) {
        setError("Currency ID is missing.")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: currencyData, error: fetchError } = await supabase
        .from("currencies")
        .select(`
          *,
          currencycountry!inner(countries(*)),
          banknotes(*)
        `)
        .eq("currencyid", currencyId)
        .single()

      if (!isMounted) return

      if (fetchError) {
        console.error("Error fetching currency details:", fetchError)
        setError(fetchError.message || "Failed to load currency details.")
        setCurrency(null)
      } else if (!currencyData) {
        setError("Currency not found.")
        setCurrency(null)
      } else {
        setCurrency(currencyData)
      }

      setIsLoading(false)
    }

    fetchCurrency()

    return () => {
      isMounted = false
    }
  }, [currencyId])

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !currency) {
    return (
      <div className="space-y-4">
        <div className="text-center text-destructive">
          <p>{error || "Currency not found."}</p>
        </div>
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => router.push("/currencies")}>Back to Currencies</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {currency.name} ({currency.code})
        </h1>
        <Link href={`/currencies/${currencyId}/edit`}>
          <Button>Edit Currency</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Currency Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            <strong>Symbol:</strong> {currency.symbol}
          </p>
          <p>
            <strong>Subunit:</strong> {currency.subunit}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Countries Using This Currency</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5">
            {(currency.currencycountry || []).map((cc: any) => (
              <li key={cc.countries?.countryid}>
                <Link href={`/countries/${cc.countries?.countryid}`} className="text-blue-600 hover:underline">
                  {cc.countries?.name}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Banknotes in This Currency</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(currency.banknotes || []).map((banknote: any) => (
              <li key={banknote.banknoteid}>
                <Link href={`/banknotes/${banknote.banknoteid}`} className="text-blue-600 hover:underline">
                  {banknote.code} - {banknote.denomination} {currency.code} ({banknote.year})
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

