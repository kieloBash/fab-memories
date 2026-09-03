// app/(pages)/(protected)/staff/admin/vendors/new/page.tsx
"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useCreateVendor } from "@/features/vendors"
import { VendorForm } from "@/features/vendors/components/vendor-form"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users } from "lucide-react"
import { SPRING } from "@/lib/framer/framer-utils"

export default function NewVendorPage() {
  const router = useRouter()
  const { mutate, isPending } = useCreateVendor()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6 max-w-2xl"
    >
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
        <ArrowLeft size={15} aria-hidden="true" /> Back
      </Button>

      <PageHeader title="Add vendor" subtitle="Add a contact to your private vendor directory" icon={Users} />

      <div className="rounded-xl border border-border bg-white p-5">
        <VendorForm
          isPending={isPending}
          submitLabel="Add to directory"
          onSubmit={(data) =>
            mutate(data, { onSuccess: () => router.push("/staff/admin/vendors") })
          }
        />
      </div>
    </motion.div>
  )
}
