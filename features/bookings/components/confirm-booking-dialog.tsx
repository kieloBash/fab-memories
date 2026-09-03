// features/bookings/components/confirm-booking-dialog.tsx
"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CalendarCheck2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useUpdateBookingStatus } from "../bookings.hooks"
import { useVendorCoverage } from "@/features/vendors"
import { VENDOR_CATEGORY_ICONS, VENDOR_CATEGORY_LABELS } from "@/features/vendors"
import { cn } from "@/lib/utils"

interface ConfirmBookingDialogProps {
  bookingId: string
  eventDate: string
  onSuccess?: () => void
}

export function ConfirmBookingDialog({
  bookingId,
  eventDate,
  onSuccess,
}: ConfirmBookingDialogProps) {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useUpdateBookingStatus()
  const { data: coverage } = useVendorCoverage(bookingId)

  const hasMissingVendors = (coverage?.missing?.length ?? 0) > 0

  const formattedDate = new Date(eventDate).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  })

  const handleConfirm = () => {
    mutate(
      { id: bookingId, input: { status: "CONFIRMED" } },
      {
        onSuccess: () => {
          setOpen(false)
          onSuccess?.()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="default">
          <CalendarCheck2 size={14} aria-hidden="true" />
          Confirm booking
        </Button>
      }>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          {/* Icon */}
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl mb-1",
            hasMissingVendors ? "bg-amber-50" : "bg-emerald-50",
          )}>
            {hasMissingVendors
              ? <AlertTriangle size={20} className="text-amber-500" aria-hidden="true" />
              : <CalendarCheck2 size={20} className="text-emerald-600" aria-hidden="true" />}
          </div>
          <DialogTitle>Confirm this booking?</DialogTitle>
          <DialogDescription>
            This will confirm the event on{" "}
            <span className="font-semibold text-text-main">{formattedDate}</span>.
            The date will be marked as unavailable for other bookings.
          </DialogDescription>
        </DialogHeader>

        {/* Vendor coverage warning (Suggestion 4) */}
        {hasMissingVendors && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-[12px] font-semibold text-amber-700 flex items-center gap-1.5">
              <AlertTriangle size={13} aria-hidden="true" />
              Unconfirmed vendor categories
            </p>
            <div className="flex flex-wrap gap-1.5">
              {coverage!.missing.map((cat) => (
                <span
                  key={cat}
                  className="flex items-center gap-1 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-700"
                >
                  {VENDOR_CATEGORY_ICONS[cat]} {VENDOR_CATEGORY_LABELS[cat]}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-amber-600">
              The client requested these vendor categories but none are confirmed in the system.
              You can still confirm if you have a verbal agreement — the warning is for your reference.
            </p>
          </div>
        )}

        {/* All covered */}
        {!hasMissingVendors && coverage && coverage.covered.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" aria-hidden="true" />
            <p className="text-[12px] text-emerald-700">
              All requested vendor categories have confirmed vendors assigned.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Confirming…" : "Yes, confirm booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
