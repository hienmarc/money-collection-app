"use client"

import type React from "react"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { BanknoteGrade, Currency, StorageUnit } from "@/lib/types"
import { useBanknote } from "@/hooks/use-banknotes"
import { createClient } from "@/utils/supabase/client"

export default function EditBanknotePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient()
  const router = useRouter()
  const { id: banknoteId } = use(params)
  const { banknote, isLoading: isLoadingBanknote, updateBanknote, isUpdating } = useBanknote(banknoteId)

  const [formData, setFormData] = useState({
    code: "",
    denomination: "",
    currencyid: "",
    year: "",
    width: "",
    height: "",
    material: "",
    storageunitid: "",
    numistaid: "",
    grade: "",
    description: "",
    front_image: "",
    back_image: "",
    front_thumbnail: "",
    back_thumbnail: "",
  })

  const [yearOptions, setYearOptions] = useState<number[]>([])

  // Queries for currencies and storage units
  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("currencies").select("currencyid, code")
      if (error) throw error
      return (data || []) as Currency[]
    },
  })

  const { data: storageUnits = [] } = useQuery({
    queryKey: ["storageUnits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("storageunits").select("storageunitid, name")
      if (error) throw error
      return (data || []) as StorageUnit[]
    },
  })

  useEffect(() => {
    if (banknote) {
      setFormData({
        code: banknote.code || "",
        denomination: banknote.denomination?.toString() || "",
        currencyid: banknote.currencyid?.toString() || "",
        year: banknote.year?.toString() || "",
        width: banknote.width?.toString() || "",
        height: banknote.height?.toString() || "",
        material: banknote.material || "",
        storageunitid: banknote.storageunitid?.toString() || "",
        numistaid: banknote.numistaid || "",
        grade: banknote.grade || "",
        description: banknote.notes || "",
        front_image: banknote.front_image || "",
        back_image: banknote.back_image || "",
        front_thumbnail: banknote.front_thumbnail || "",
        back_thumbnail: banknote.back_thumbnail || "",
      })

      if (banknote.year) {
        const currentYear = new Date().getFullYear()
        const years = Array.from({ length: currentYear - banknote.year + 1 }, (_, i) => banknote.year + i)
        setYearOptions(years)
      }
    }
  }, [banknote])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    updateBanknote(
      {
        code: formData.code,
        denomination: Number.parseFloat(formData.denomination),
        currencyid: Number.parseInt(formData.currencyid),
        year: Number.parseInt(formData.year),
        width: formData.width ? Number.parseFloat(formData.width) : null,
        height: formData.height ? Number.parseFloat(formData.height) : null,
        material: formData.material,
        storageunitid: Number.parseInt(formData.storageunitid),
        numistaid: formData.numistaid,
        grade: formData.grade as BanknoteGrade,
        notes: formData.description,
        front_image: formData.front_image,
        back_image: formData.back_image,
        front_thumbnail: formData.front_thumbnail,
        back_thumbnail: formData.back_thumbnail,
      } as any,
      {
        onSuccess: () => {
          router.push("/banknotes")
          router.refresh()
        },
      },
    )
  }

  const validateForm = () => {
    const requiredFields = ["code", "denomination", "currencyid", "year", "grade", "width", "height"]
    const missingFields = requiredFields.filter((field) => !formData[field as keyof typeof formData])

    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in all required fields: ${missingFields.join(", ")}`,
        variant: "destructive",
      })
      return false
    }
    return true
  }

  if (isLoadingBanknote) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Banknote</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between mb-6">
            <div className="w-[48%]">
              <Label>Front Image</Label>
              <img
                src={formData.front_image || "/placeholder.svg"}
                alt="Front of banknote"
                className="w-full h-48 object-contain bg-gray-100 rounded-md"
              />
            </div>
            <div className="w-[48%]">
              <Label>Back Image</Label>
              <img
                src={formData.back_image || "/placeholder.svg"}
                alt="Back of banknote"
                className="w-full h-48 object-contain bg-gray-100 rounded-md"
              />
            </div>
          </div>

          <Tabs defaultValue="general">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General Info</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input id="code" name="code" value={formData.code} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="denomination">Denomination</Label>
                  <Input
                    id="denomination"
                    name="denomination"
                    type="number"
                    step="0.01"
                    value={formData.denomination}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    name="currencyid"
                    value={formData.currencyid}
                    onValueChange={(value) => handleChange({ target: { name: "currencyid", value } } as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.currencyid} value={currency.currencyid.toString()}>
                          {currency.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  {yearOptions.length > 0 ? (
                    <Select
                      name="year"
                      value={formData.year}
                      onValueChange={(value) => handleChange({ target: { name: "year", value } } as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input id="year" name="year" type="number" value={formData.year} onChange={handleChange} required />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="width">Width (mm)</Label>
                  <Input
                    id="width"
                    name="width"
                    type="number"
                    step="0.01"
                    value={formData.width}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (mm)</Label>
                  <Input
                    id="height"
                    name="height"
                    type="number"
                    step="0.01"
                    value={formData.height}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="material">Material</Label>
                  <Input id="material" name="material" value={formData.material} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storageUnit">Storage Unit</Label>
                  <Select
                    name="storageunitid"
                    value={formData.storageunitid}
                    onValueChange={(value) => handleChange({ target: { name: "storageunitid", value } } as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select storage unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {storageUnits.map((unit) => (
                        <SelectItem key={unit.storageunitid} value={unit.storageunitid.toString()}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numistaid">Numista ID</Label>
                  <Input id="numistaid" name="numistaid" value={formData.numistaid} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Select
                    name="grade"
                    value={formData.grade}
                    onValueChange={(value) => handleChange({ target: { name: "grade", value } } as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(BanknoteGrade).map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                />
              </div>
            </TabsContent>
            <TabsContent value="images" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="front_image">Front Image URL</Label>
                  <Input
                    id="front_image"
                    name="front_image"
                    value={formData.front_image}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="back_image">Back Image URL</Label>
                  <Input id="back_image" name="back_image" value={formData.back_image} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="front_thumbnail">Front Thumbnail URL</Label>
                  <Input
                    id="front_thumbnail"
                    name="front_thumbnail"
                    value={formData.front_thumbnail}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="back_thumbnail">Back Thumbnail URL</Label>
                  <Input
                    id="back_thumbnail"
                    name="back_thumbnail"
                    value={formData.back_thumbnail}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button type="submit" disabled={isUpdating} className="w-full">
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Banknote"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
