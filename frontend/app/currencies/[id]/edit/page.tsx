"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiSelect } from "@/components/ui/multi-select"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/utils/supabase/client"

export default function EditCurrencyPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const router = useRouter()
  const [currency, setCurrency] = useState(null)
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [symbol, setSymbol] = useState("")
  const [subunit, setSubunit] = useState("")
  const [countries, setCountries] = useState([])
  const [availableCountries, setAvailableCountries] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchCurrency()
    fetchCountries()
  }, [])

  async function fetchCurrency() {
    const { data, error } = await supabase
      .from("currencies")
      .select(`
        *,
        currencycountry(countryid)
      `)
      .eq("currencyid", params.id)
      .single()

    if (error) {
      console.error("Error fetching currency:", error)
      toast({
        title: "Error",
        description: "Failed to fetch currency data. Please try again.",
        variant: "destructive",
      })
    } else {
      setCurrency(data)
      setName(data.name)
      setCode(data.code)
      setSymbol(data.symbol || "")
      setSubunit(data.subunit || "")
      setCountries(data.currencycountry.map((cc) => cc.countryid.toString()))
    }
  }

  async function fetchCountries() {
    const { data, error } = await supabase.from("countries").select("countryid, name")
    if (error) {
      console.error("Error fetching countries:", error)
    } else {
      setAvailableCountries(data.map((country) => ({ value: country.countryid.toString(), label: country.name })))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!validateForm()) {
      setIsLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("currencies")
      .update({
        name,
        code,
        symbol,
        subunit,
      })
      .eq("currencyid", params.id)

    if (error) {
      console.error("Error updating currency:", error)
      toast({
        title: "Error",
        description: "Failed to update currency. Please try again.",
        variant: "destructive",
      })
    } else {
      // Update country associations
      const { error: deleteError } = await supabase.from("currencycountry").delete().eq("currencyid", params.id)

      if (deleteError) {
        console.error("Error deleting old country associations:", deleteError)
      }

      const newAssociations = countries.map((countryId) => ({
        currencyid: Number.parseInt(params.id),
        countryid: Number.parseInt(countryId),
        iscurrent: true,
      }))

      const { error: insertError } = await supabase.from("currencycountry").insert(newAssociations)

      if (insertError) {
        console.error("Error inserting new country associations:", insertError)
        toast({
          title: "Warning",
          description: "Currency updated, but there was an error updating country associations.",
          variant: "warning",
        })
      } else {
        toast({
          title: "Success",
          description: "Currency updated successfully.",
        })
        router.push("/currencies")
        router.refresh()
      }
    }

    setIsLoading(false)
  }

  const validateForm = () => {
    if (!name || !code) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  if (!currency) {
    return <div>Loading...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Currency</h1>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="max-w-[200px]" />
        </div>
        <div>
          <Label htmlFor="code">Code</Label>
          <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required className="max-w-[100px]" />
        </div>
        <div>
          <Label htmlFor="symbol">Symbol</Label>
          <Input id="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="max-w-[100px]" />
        </div>
        <div>
          <Label htmlFor="subunit">Subunit</Label>
          <Input id="subunit" value={subunit} onChange={(e) => setSubunit(e.target.value)} className="max-w-[200px]" />
        </div>
      </div>
      <div>
        <Label htmlFor="countries">Countries</Label>
        <MultiSelect
          options={availableCountries}
          selected={countries}
          onChange={setCountries}
          placeholder="Select countries..."
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Updating..." : "Update Currency"}
      </Button>
    </form>
  )
}

