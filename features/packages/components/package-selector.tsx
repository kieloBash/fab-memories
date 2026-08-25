// features/packages/components/package-selector.tsx
"use client"

import { usePackages } from "../packages.hooks"
import { PackageCard } from "./package-card"
import type { Package } from "../packages.types"
import type { EventType } from "@/app/generated/prisma/client"

interface PackageSelectorProps {
  eventType?: EventType
  selectedId?: string
  onSelect: (pkg: Package) => void
}

export function PackageSelector({ eventType, selectedId, onSelect }: PackageSelectorProps) {
  const { data: packages, isLoading, isError } = usePackages(true)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading packages…</p>
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load packages. Please try again.
      </p>
    )
  }

  const filtered = eventType
    ? packages?.filter((p) => p.eventType === eventType)
    : packages

  if (!filtered?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No packages available{eventType ? " for this event type" : ""}.
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {filtered.map((pkg) => (
        <PackageCard
          key={pkg.id}
          pkg={pkg}
          selected={pkg.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
