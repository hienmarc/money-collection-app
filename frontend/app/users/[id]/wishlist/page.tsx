"use client"

import { use } from "react"
import WishlistPageContent from "@/components/WishlistPageContent"

export default function UserWishlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <WishlistPageContent userId={id} />
}
