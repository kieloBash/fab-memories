// app/(pages)/(protected)/(staff)/staff/admin/packages/page.tsx
"use client"

import { useRouter } from "next/navigation"
import { usePackages } from "@/features/packages"
import { PackageCard } from "@/features/packages/components/package-card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function AdminPackagesPage() {
  const router = useRouter()
  const { data: packages, isLoading, isError } = usePackages()

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Service Packages</h1>
        <Button onClick={() => router.push("/staff/admin/packages/new")}>
          <Plus className="mr-2 size-4" /> New Package
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading packages…</p>}
      {isError && <p className="text-destructive">Failed to load packages.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {packages?.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>

      {packages?.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No packages yet.</p>
      )}
    </div>
  )
}
