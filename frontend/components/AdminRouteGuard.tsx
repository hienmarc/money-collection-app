"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { useIsAdmin } from "@/hooks/use-is-admin"

interface AdminRouteGuardProps {
  children: ReactNode
  backHref: string
}

export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useIsAdmin()

  return isAdmin ? <>{children}</> : null
}

export function AdminRouteGuard({ children, backHref }: AdminRouteGuardProps) {
  const { isAdmin, isLoading, error } = useIsAdmin()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto p-8 text-center space-y-4 my-12">
        <CardTitle className="text-2xl font-bold">Unable to verify access</CardTitle>
        <p className="text-sm text-muted-foreground">
          Admin access could not be checked. Please try again later.
        </p>
        <Button asChild className="mt-4">
          <Link href={backHref}>Back</Link>
        </Button>
      </Card>
    )
  }

  if (!isAdmin) {
    return (
      <Card className="max-w-md mx-auto p-8 text-center space-y-4 my-12">
        <CardTitle className="text-2xl font-bold">Unauthorized</CardTitle>
        <p className="text-sm text-muted-foreground">
          You do not have permission to manage this shared catalog.
        </p>
        <Button asChild className="mt-4">
          <Link href={backHref}>Back</Link>
        </Button>
      </Card>
    )
  }

  return <>{children}</>
}
