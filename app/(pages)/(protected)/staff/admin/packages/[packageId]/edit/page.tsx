// app/(pages)/(protected)/staff/admin/packages/[packageId]/edit/page.tsx
"use client"

import { Button } from "@/components/ui/button"
import { PackageForm } from "@/features/packages/components/package-form"
import { usePackage, useUpdatePackage } from "@/features/packages"
import { ArrowLeft } from "lucide-react"
import { useParams, useRouter } from "next/navigation"

export default function EditPackagePage() {
  const router = useRouter()
  const { packageId } = useParams<{ packageId: string }>()
  const { data: pkg, isLoading, isError } = usePackage(packageId)
  const { mutate, isPending } = useUpdatePackage()

  return (
    <div className="container max-w-xl py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 size-4" /> Back
      </Button>

      <h1 className="text-2xl font-bold">Edit Package</h1>

      {isLoading && <p className="text-muted-foreground">Loading package…</p>}
      {isError && <p className="text-destructive">Couldn't load this package.</p>}
      {pkg && (
        <PackageForm
          initial={pkg}
          submitLabel="Save Changes"
          pendingLabel="Saving…"
          isPending={isPending}
          onSubmit={(input) => mutate({ id: packageId, input }, { onSuccess: () => router.push("/staff/admin/packages") })}
        />
      )}
    </div>
  )
}
