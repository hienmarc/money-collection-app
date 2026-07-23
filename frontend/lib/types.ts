export enum BanknoteGrade {
  G = "G",
  VG = "VG",
  F = "F",
  VF = "VF",
  XF = "XF",
  AU = "AU",
  UNC = "UNC",
}

export interface Currency {
  currencyid: number
  code: string
  name: string
  numistaid?: number
  symbol?: string
  created_at?: string
}

export interface StorageUnit {
  storageunitid: number
  name: string
  description?: string
  created_at?: string
}

export interface Banknote {
  banknoteid: string
  code: string
  denomination: number
  currencyid: number
  currencies?: Partial<Currency>
  year: number
  width: number
  height: number
  material?: string
  grade: BanknoteGrade
  storageunitid: number
  storageunits?: Partial<StorageUnit>
  front_image?: string
  back_image?: string
  front_thumbnail?: string
  back_thumbnail?: string
  notes?: string
  acquisition_date?: string
  acquisition_price?: number
  current_value?: number
  condition_notes?: string
  numistaid?: string
  created_at?: string
  updated_at?: string
}

export interface BanknoteFilters {
  currency: string
  year: string
  material: string
  storageUnit: string
  grade: string
  denomination: {
    min: string
    max: string
  }
}

export interface SortConfig {
  key: keyof Banknote | "currency" | "storageUnit"
  direction: "asc" | "desc"
}
