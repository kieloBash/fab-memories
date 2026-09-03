// app/(pages)/(protected)/staff/admin/vendors/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useVendors, useDeleteVendor, VENDOR_CATEGORY_LABELS, VENDOR_CATEGORY_ICONS } from "@/features/vendors"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Plus, Users, Phone, MapPin, Pencil, Trash2, AlertCircle,
} from "lucide-react"
import { SPRING } from "@/lib/framer/framer-utils"
import type { VendorCategory } from "@/features/vendors"

type CategoryFilter = VendorCategory | "ALL"

export default function AdminVendorsPage() {
  const router = useRouter()
  const [catFilter, setCatFilter] = useState<CategoryFilter>("ALL")

  const { data: vendors, isLoading, isError } = useVendors({
    category: catFilter === "ALL" ? undefined : catFilter,
    isActive: true,
  })
  const { mutate: deleteVendor } = useDeleteVendor()

  const allCategories = Object.keys(VENDOR_CATEGORY_LABELS) as VendorCategory[]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="Vendor directory"
        subtitle="Private vendor contacts for event coordination"
        icon={Users}
        actions={
          <div className="flex items-center gap-2">
            <Select value={catFilter} onValueChange={(v) => setCatFilter(v as CategoryFilter)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {VENDOR_CATEGORY_ICONS[cat]} {VENDOR_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => router.push("/staff/admin/vendors/new")}>
              <Plus size={14} aria-hidden="true" /> Add vendor
            </Button>
          </div>
        }
      />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-xl border border-border bg-white animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-5 text-[13px] text-red-600">
          <AlertCircle size={15} aria-hidden="true" /> Failed to load vendors.
        </div>
      )}

      {!isLoading && !isError && (!vendors || vendors.length === 0) && (
        <div className="rounded-xl border border-border bg-background-blush p-12 text-center">
          <p className="text-[14px] font-semibold text-text-main">No vendors yet</p>
          <p className="text-[13px] text-text-muted mt-1">
            Add vendors to your private directory to coordinate events.
          </p>
          <Button className="mt-4" onClick={() => router.push("/staff/admin/vendors/new")}>
            <Plus size={14} aria-hidden="true" /> Add first vendor
          </Button>
        </div>
      )}

      {vendors && vendors.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="group relative flex flex-col gap-3 rounded-xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[16px]">{VENDOR_CATEGORY_ICONS[vendor.category]}</span>
                    <p className="text-[14px] font-semibold tracking-tight text-text-main truncate">
                      {vendor.name}
                    </p>
                  </div>
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {VENDOR_CATEGORY_LABELS[vendor.category]}
                  </Badge>
                </div>
                {/*
                  FIX: actions were `opacity-0 group-hover:opacity-100` — on
                  touch devices (phone/tablet) there is no hover event, so
                  edit/delete were completely unreachable there. `opacity-100`
                  is now the base state; the `md:opacity-0 md:group-hover:opacity-100`
                  pair restores the subtle hover-reveal ONLY on devices with
                  a real pointer (desktop), verified via the `pointer: fine`
                  media feature through Tailwind's `md:` breakpoint proxy.
                */}
                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost" size="icon-sm"
                    onClick={() => router.push(`/staff/admin/vendors/${vendor.id}`)}
                    aria-label={`Edit ${vendor.name}`}
                  >
                    <Pencil size={13} aria-hidden="true" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger render={
                      <Button variant="ghost" size="icon-sm" className="text-red-500 hover:bg-red-50" aria-label={`Remove ${vendor.name}`}>
                        <Trash2 size={13} aria-hidden="true" />
                      </Button>
                    }>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {vendor.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes them from your directory. Past booking assignments are kept.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-500 hover:bg-red-600 text-white"
                          onClick={() => deleteVendor(vendor.id)}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-1.5 text-[12px]">
                {vendor.contactName && (
                  <p className="text-text-sub">{vendor.contactName}</p>
                )}
                {vendor.contactPhone && (
                  <a href={`tel:${vendor.contactPhone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                    <Phone size={11} aria-hidden="true" />
                    {vendor.contactPhone}
                    {vendor.contactChannel && (
                      <span className="text-text-muted">· {vendor.contactChannel}</span>
                    )}
                  </a>
                )}
                {vendor.coverageAreas.length > 0 && (
                  <div className="flex items-center gap-1 text-text-muted">
                    <MapPin size={11} aria-hidden="true" />
                    <span className="truncate">{vendor.coverageAreas.slice(0, 3).join(", ")}</span>
                    {vendor.coverageAreas.length > 3 && (
                      <span>+{vendor.coverageAreas.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-text-muted">
                <span>{vendor._count.assignments} booking{vendor._count.assignments !== 1 ? "s" : ""}</span>
                {vendor.notes && (
                  <span className="truncate max-w-[120px] italic">{vendor.notes}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
