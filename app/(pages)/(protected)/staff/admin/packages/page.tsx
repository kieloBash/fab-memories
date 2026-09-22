// app/(pages)/(protected)/(staff)/staff/admin/packages/page.tsx
"use client"

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useUpdatePackage, usePackages } from "@/features/packages"
import { PackageCard } from "@/features/packages/components/package-card"
import type { PackageWithBookingCount } from "@/features/packages/packages.types"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function AdminPackagesPage() {
  const router = useRouter()
  const { data: packages, isLoading, isError } = usePackages()
  const { mutate: updatePackage, isPending } = useUpdatePackage()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<PackageWithBookingCount | null>(null)

  const toggle = (pkg: PackageWithBookingCount) => {
    // Only ask for confirmation when TAKING a package OFF the public site — turning one back on is reversible
    // and low-risk, so it doesn't need a dialog.
    if (pkg.isActive) { setConfirmTarget(pkg); return }
    setPendingId(pkg.id)
    updatePackage({ id: pkg.id, input: { isActive: true } }, { onSettled: () => setPendingId(null) })
  }

  const confirmDeactivate = () => {
    if (!confirmTarget) return
    setPendingId(confirmTarget.id)
    updatePackage({ id: confirmTarget.id, input: { isActive: false } }, { onSettled: () => setPendingId(null) })
    setConfirmTarget(null)
  }

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
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            onEdit={(p) => router.push(`/staff/admin/packages/${p.id}/edit`)}
            onToggleActive={() => toggle(pkg)}
            isTogglingActive={isPending && pendingId === pkg.id}
          />
        ))}
      </div>

      {packages?.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No packages yet.</p>
      )}

      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate "{confirmTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer be offered on the public packages page or the booking form.
              {confirmTarget && confirmTarget._count.bookings > 0 && (
                <> Its {confirmTarget._count.bookings} existing booking{confirmTarget._count.bookings === 1 ? "" : "s"} keep their agreed price and are not affected.</>
              )}
              {" "}You can reactivate it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
