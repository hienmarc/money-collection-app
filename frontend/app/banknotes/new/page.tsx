"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/utils/supabase/client"
import {
  Loader2,
  Info,
  ArrowLeft,
  Banknote as BanknoteIcon,
  DollarSign,
  Coins,
  Calendar,
  Star,
  Archive,
  Ruler,
  RulerIcon as RulerSquare,
  Layers,
  FileText,
  ImageIcon,
  FileImage,
  Database,
  Save,
  FileDigit,
  ExternalLink,
} from "lucide-react"
import { BanknoteGrade, Currency, StorageUnit } from "@/lib/types"
import Link from "next/link"

export default function NewBanknotePage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const numistaIdParam = searchParams.get("numista_id")
  const serialNumber = searchParams.get("serial_number")
  const yearParam = searchParams.get("year")
  const gradeParam = searchParams.get("grade")
  const returnUrl = searchParams.get("return_url") || (searchParams.get("numista_id") ? "/catalog" : "/banknotes")
  const backOnSubmit = searchParams.get("back_on_submit") === "true"

  const [formData, setFormData] = useState({
    code: serialNumber || "",
    denomination: "",
    currencyid: "",
    year: yearParam || "",
    width: "",
    height: "",
    material: "",
    storageunitid: "",
    numistaid: numistaIdParam || "",
    grade: gradeParam || "",
    description: "",
    front_image: "",
    back_image: "",
    front_thumbnail: "",
    back_thumbnail: "",
  })

  const [yearOptions, setYearOptions] = useState<number[]>([])
  const [currencyNumistaId, setCurrencyNumistaId] = useState("")

  // Queries
  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("currencies").select("currencyid, code, numistaid")
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

  // Mutations
  const fetchNumistaMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/numista/types/${id}`)
      if (!response.ok) throw new Error("Failed to fetch Numista data")
      return response.json()
    },
    onSuccess: (data) => {
      setFormData((prev) => ({
        ...prev,
        denomination: data.value?.numeric_value?.toString() || "",
        year: data.min_year?.toString() || "",
        front_image: data.obverse?.picture || "",
        back_image: data.reverse?.picture || "",
        front_thumbnail: data.obverse?.thumbnail || "",
        back_thumbnail: data.reverse?.thumbnail || "",
        material: data.composition?.text || "",
        width: data?.size || "",
        height: data?.size2 || "",
        description: (data.obverse?.description || "") + "\n" + (data.reverse?.description || ""),
      }))

      if (data.min_year && data.max_year) {
        const years = Array.from({ length: data.max_year - data.min_year + 1 }, (_, i) => data.min_year + i)
        setYearOptions(years)
      }

      // Auto-select currency based on Numista data
      const currency = currencies.find((c) => c.numistaid == data.value?.currency?.id)
      if (currency) {
        setFormData((prev) => ({ ...prev, currencyid: currency.currencyid.toString() }))
      } else {
        setCurrencyNumistaId(data.value?.currency?.id || "")
      }
    },
    onError: (error) => {
      console.error("Error fetching Numista data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch data from Numista. Please fill in the details manually.",
        variant: "destructive",
      })
    },
  })

  const saveBanknoteMutation = useMutation({
    mutationFn: async (banknoteData: any) => {
      const { data, error } = await supabase.from("banknotes").insert([banknoteData])
      console.log("Inserted banknote data:", data)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banknotes"] })
      toast({ title: "Success", description: "New banknote added successfully." })

      if (backOnSubmit) {
        router.back()
        return
      }
      
      if (formData.numistaid && !returnUrl) {
        router.push(
          `/banknotes/new/success?numista_id=${formData.numistaid}&return_url=${encodeURIComponent(returnUrl)}`,
        )
      } else {
        router.push(returnUrl)
      }
      router.refresh()
    },
    onError: (error) => {
      console.error("Error adding new banknote:", error)
      toast({ title: "Error", description: "Failed to add new banknote. Please try again.", variant: "destructive" })
    },
  })

  const updateCurrencyMutation = useMutation({
    mutationFn: async ({ currencyId, numistaId }: { currencyId: string; numistaId: string }) => {
      const { error } = await supabase.from("currencies").update({ numistaid: numistaId }).eq("currencyid", currencyId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currencies"] })
    },
  })

  useEffect(() => {
    if (numistaIdParam && currencies.length > 0) {
      fetchNumistaMutation.mutate(numistaIdParam)
    }
  }, [numistaIdParam, currencies.length])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const banknoteToSave = {
      ...formData,
      denomination: Number.parseFloat(formData.denomination),
      currencyid: Number.parseInt(formData.currencyid),
      year: Number.parseInt(formData.year),
      width: formData.width ? Number.parseFloat(formData.width) : null,
      height: formData.height ? Number.parseFloat(formData.height) : null,
      storageunitid: Number.parseInt(formData.storageunitid),
    }

    saveBanknoteMutation.mutate(banknoteToSave, {
      onSuccess: () => {
        if (currencyNumistaId) {
          updateCurrencyMutation.mutate({ currencyId: formData.currencyid, numistaId: currencyNumistaId })
        }
      },
    })
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

  const handleNumistaFetch = () => {
    if (formData.numistaid) {
      fetchNumistaMutation.mutate(formData.numistaid)
    }
  }

  const isSaving = saveBanknoteMutation.isPending || updateCurrencyMutation.isPending
  const isFetchingNumista = fetchNumistaMutation.isPending

  return (
    <div className="container max-w-7xl mx-auto px-4">
      <div className="flex items-center mb-4">
        <Link href={returnUrl}>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center ml-2">
          <BanknoteIcon className="h-5 w-5 mr-2 text-primary" />
          Add New Banknote
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column - Images */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="overflow-hidden">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1 block flex items-center">
                      <FileImage className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      Front Image
                    </Label>
                    <div className="relative aspect-[5/3] bg-gray-100 rounded-md overflow-hidden border">
                      <img
                        src={formData.front_image || "/placeholder.svg?height=300&width=450"}
                        alt="Front of banknote"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1 block flex items-center">
                      <FileImage className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      Back Image
                    </Label>
                    <div className="relative aspect-[5/3] bg-gray-100 rounded-md overflow-hidden border">
                      <img
                        src={formData.back_image || "/placeholder.svg?height=300&width=450"}
                        alt="Back of banknote"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Form fields */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="general" className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      General Info
                    </TabsTrigger>
                    <TabsTrigger value="images" className="flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Images & Details
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4 mt-0">
                    {/* First row: Code, Denomination, Currency */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="code" className="text-xs font-medium flex items-center">
                          <FileDigit className="h-3 w-3 mr-1 text-muted-foreground" />
                          Code
                        </Label>
                        <Input
                          id="code"
                          name="code"
                          value={formData.code}
                          onChange={handleChange}
                          required
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="denomination" className="text-xs font-medium flex items-center">
                          <DollarSign className="h-3 w-3 mr-1 text-muted-foreground" />
                          Denomination
                        </Label>
                        <Input
                          id="denomination"
                          name="denomination"
                          type="number"
                          step="0.01"
                          value={formData.denomination}
                          onChange={handleChange}
                          required
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="currency" className="text-xs font-medium flex items-center">
                          <Coins className="h-3 w-3 mr-1 text-muted-foreground" />
                          Currency
                        </Label>
                        <Select
                          name="currencyid"
                          value={formData.currencyid}
                          onValueChange={(value) => handleChange({ target: { name: "currencyid", value } } as any)}
                        >
                          <SelectTrigger className="h-8 text-sm">
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
                    </div>

                    {/* Second row: Year, Grade, Storage Unit */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="year" className="text-xs font-medium flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                          Year
                        </Label>
                        {yearOptions.length > 0 ? (
                          <Select
                            name="year"
                            value={formData.year}
                            onValueChange={(value) => handleChange({ target: { name: "year", value } } as any)}
                          >
                            <SelectTrigger className="h-8 text-sm">
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
                          <Input
                            id="year"
                            name="year"
                            type="number"
                            value={formData.year}
                            onChange={handleChange}
                            required
                            className="h-8 text-sm"
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="grade" className="text-xs font-medium flex items-center">
                          <Star className="h-3 w-3 mr-1 text-muted-foreground" />
                          Grade
                        </Label>
                        <Select
                          name="grade"
                          value={formData.grade}
                          onValueChange={(value) => handleChange({ target: { name: "grade", value } } as any)}
                        >
                          <SelectTrigger className="h-8 text-sm">
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

                      <div className="space-y-1">
                        <Label htmlFor="storageUnit" className="text-xs font-medium flex items-center">
                          <Archive className="h-3 w-3 mr-1 text-muted-foreground" />
                          Storage Unit
                        </Label>
                        <Select
                          name="storageunitid"
                          value={formData.storageunitid}
                          onValueChange={(value) => handleChange({ target: { name: "storageunitid", value } } as any)}
                        >
                          <SelectTrigger className="h-8 text-sm">
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
                    </div>

                    {/* Third row: Width, Height, Material */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="width" className="text-xs font-medium flex items-center">
                          <Ruler className="h-3 w-3 mr-1 text-muted-foreground" />
                          Width (mm)
                        </Label>
                        <Input
                          id="width"
                          name="width"
                          type="number"
                          step="0.01"
                          required
                          value={formData.width}
                          onChange={handleChange}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="height" className="text-xs font-medium flex items-center">
                          <RulerSquare className="h-3 w-3 mr-1 text-muted-foreground" />
                          Height (mm)
                        </Label>
                        <Input
                          id="height"
                          name="height"
                          type="number"
                          step="0.01"
                          required
                          value={formData.height}
                          onChange={handleChange}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="material" className="text-xs font-medium flex items-center">
                          <Layers className="h-3 w-3 mr-1 text-muted-foreground" />
                          Material
                        </Label>
                        <Input
                          id="material"
                          name="material"
                          value={formData.material}
                          onChange={handleChange}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Description and Submit button */}
                    <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
                      <div className="space-y-1 md:col-span-7">
                        <Label htmlFor="description" className="text-xs font-medium flex items-center">
                          <FileText className="h-3 w-3 mr-1 text-muted-foreground" />
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          rows={3}
                          className="text-sm"
                        />
                      </div>

                      <div className="flex flex-col space-y-2 h-full mt-5">
                        <Button type="submit" disabled={isSaving} className="h-20 w-full">
                          {isSaving ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="h-12 w-12" />}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="images" className="space-y-4 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="front_image" className="text-xs font-medium flex items-center">
                          <ImageIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                          Front Image URL
                        </Label>
                        <Input
                          id="front_image"
                          name="front_image"
                          value={formData.front_image}
                          onChange={handleChange}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="back_image" className="text-xs font-medium flex items-center">
                          <ImageIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                          Back Image URL
                        </Label>
                        <Input
                          id="back_image"
                          name="back_image"
                          value={formData.back_image}
                          onChange={handleChange}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="front_thumbnail" className="text-xs font-medium flex items-center">
                          <ImageIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                          Front Thumbnail URL
                        </Label>
                        <Input
                          id="front_thumbnail"
                          name="front_thumbnail"
                          value={formData.front_thumbnail}
                          onChange={handleChange}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="back_thumbnail" className="text-xs font-medium flex items-center">
                          <ImageIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                          Back Thumbnail URL
                        </Label>
                        <Input
                          id="back_thumbnail"
                          name="back_thumbnail"
                          value={formData.back_thumbnail}
                          onChange={handleChange}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Numista ID section */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="numistaid" className="text-sm font-medium flex items-center">
                      <Database className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      Numista ID
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleNumistaFetch}
                        disabled={!formData.numistaid || isFetchingNumista}
                        className="h-7 text-xs px-2 bg-transparent"
                      >
                        {isFetchingNumista ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Fetching...
                          </>
                        ) : (
                          <>
                            <Database className="mr-1 h-3 w-3" />
                            Fetch Data
                          </>
                        )}
                      </Button>
                      {formData.numistaid && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() =>
                            window.open(`https://en.numista.com/catalogue/note${formData.numistaid}.html`, "_blank")
                          }
                        >
                          <ExternalLink className="h-3 w-3 transform rotate-45" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      id="numistaid"
                      name="numistaid"
                      value={formData.numistaid}
                      onChange={handleChange}
                      className="flex-1 h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-start text-xs text-muted-foreground">
                    <Info className="h-3 w-3 mr-1 mt-0.5 text-blue-500" />
                    <span>Enter a Numista ID to automatically fetch banknote details</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
