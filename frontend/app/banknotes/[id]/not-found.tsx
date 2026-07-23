import Link from "next/link"
import { ArrowLeft, FileX } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function BanknoteNotFound() {
  return (
    <div className="container mx-auto py-12 flex flex-col items-center justify-center text-center">
      <FileX className="h-24 w-24 text-muted-foreground mb-6" />
      <h1 className="text-3xl font-bold mb-2">Banknote Not Found</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        The banknote you're looking for doesn't exist or may have been removed from your collection.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/banknotes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Banknotes
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/banknotes/new">Add New Banknote</Link>
        </Button>
      </div>
    </div>
  )
}
