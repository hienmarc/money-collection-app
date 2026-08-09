"use client"

import type React from "react"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/utils/supabase/client"

export default function EditCountryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: countryId } = use(params)
  const supabase = createClient()
  const router = useRouter()
  const [country, setCountry] = useState(null)
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchCountry()
  }, [])

  async function fetchCountry() {
    const { data, error } = await supabase.from("countries").select("*").eq("countryid", countryId).single()

    if (error) {
      console.error("Error fetching country:", error)
      toast({
        title: "Error",
        description: "Failed to fetch country data. Please try again.",
        variant: "destructive",
      })
    } else {
      setCountry(data)
      setName(data.name)
      setCode(data.code)
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
      .from("countries")
      .update({
        name,
        code,
      })
      .eq("countryid", countryId)

    setIsLoading(false)

    if (error) {
      console.error("Error updating country:", error)
      toast({
        title: "Error",
        description: "Failed to update country. Please try again.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Country updated successfully.",
      })
      router.push("/countries")
      router.refresh()
    }
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

  if (!country) {
    return <div>Loading...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-2xl font-bold mb-6">Edit Country</h1>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="code">Code</Label>
        <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Updating..." : "Update Country"}
      </Button>
    </form>
  )
}

