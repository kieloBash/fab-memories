// app/(pages)/(protected)/staff/admin/vendors/[vendorId]/page.tsx
"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useVendor, useUpdateVendor, VENDOR_CATEGORY_LABELS, VENDOR_CATEGORY_ICONS } from "@/features/vendors"
import { VendorForm } from "@/features/vendors/components/vendor-form"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CalendarDays, Users } from "lucide-react"
import { SPRING } from "@/lib/framer/framer-utils"

interface Props { params: Promise<{ vendorId: string }> }

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })

export default function EditVendorPage({ params }: Props) {
  const { vendorId } = use(params)
  const router = useRouter()

  const { data: vendor, isLoading } = useVendor(vendorId)
  const { mutate, isPending } = useUpdateVendor()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl border border-border bg-white animate-pulse" />
        ))}
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-[13px] text-red-600">
        Vendor not found.
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6 max-w-2xl"
    >
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
        <ArrowLeft size={15} aria-hidden="true" /> Back to directory
      </Button>

      <PageHeader
        title={vendor.name}
        subtitle={`${VENDOR_CATEGORY_ICONS[vendor.category]} ${VENDOR_CATEGORY_LABELS[vendor.category]}`}
        icon={Users}
        actions={
          <Badge variant={vendor.isActive ? "success" : "muted"}>
            {vendor.isActive ? "Active" : "Inactive"}
          </Badge>
        }
      />

      {/* Edit form */}
      <div className="rounded-xl border border-border bg-white p-5">
        <VendorForm
          initial={vendor}
          isPending={isPending}
          submitLabel="Save changes"
          onSubmit={(data) =>
            mutate(
              { id: vendorId, input: data },
              { onSuccess: () => router.push("/staff/admin/vendors") },
            )
          }
        />
      </div>

      {/* Recent booking assignments */}
      {(vendor as any).assignments && (vendor as any).assignments.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-5 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
            Recent bookings ({vendor._count.assignments} total)
          </p>
          <div className="space-y-2">
            {((vendor as any).assignments as any[]).map((a: any) => (
              <button
                key={a.id}
                onClick={() => router.push(`/staff/admin/bookings/${a.booking.id}`)}
                className="w-full flex items-center justify-between rounded-xl border border-border bg-background-blush px-4 py-3 hover:border-border-strong hover:bg-primary-soft/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <CalendarDays size={14} className="text-primary shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-[12px] font-semibold text-text-main">
                      {a.booking.eventType} · {a.booking.client.fullName}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {fmtDate(a.booking.eventDate)} · {a.booking.venue}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    a.booking.status === "CONFIRMED" ? "success"
                    : a.booking.status === "CANCELLED" ? "destructive"
                    : "warning"
                  }
                >
                  {a.booking.status}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
