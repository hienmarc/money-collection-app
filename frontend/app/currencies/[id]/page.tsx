import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"

async function getCurrencyDetails(id: string) {
  const supabase = createClient()
  const { data: currency, error } = await supabase
    .from("currencies")
    .select(`
      *,
      currencycountry!inner(countries(*)),
      banknotes(*)
    `)
    .eq("currencyid", id)
    .single()

  if (error) {
    console.error("Error fetching currency details:", error)
    return null
  }

  return currency
}

export default async function CurrencyDetailsPage({ params }: { params: { id: string } }) {
  const currency = await getCurrencyDetails(params.id)

  if (!currency) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {currency.name} ({currency.code})
        </h1>
        <Link href={`/currencies/${params.id}/edit`}>
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

