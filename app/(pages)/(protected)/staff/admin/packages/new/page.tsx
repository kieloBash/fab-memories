// app/(pages)/(protected)/(staff)/staff/admin/packages/new/page.tsx
"use client"

import { Button } from "@/components/ui/button"
import { PackageForm } from "@/features/packages/components/package-form"
import { useCreatePackage } from "@/features/packages"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function NewPackagePage() {
  const router = useRouter()
  const { mutate, isPending } = useCreatePackage()

  return (
    <div className="container max-w-xl py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 size-4" /> Back
      </Button>

      <h1 className="text-2xl font-bold">New Package</h1>

      <PackageForm
        submitLabel="Create Package"
        pendingLabel="Creating…"
        isPending={isPending}
        onSubmit={(input) => mutate(input, { onSuccess: () => router.push("/staff/admin/packages") })}
      />
    </div>
  )
}
