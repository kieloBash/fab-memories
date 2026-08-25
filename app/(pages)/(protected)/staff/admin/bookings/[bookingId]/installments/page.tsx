// app/(pages)/(protected)/(staff)/staff/admin/bookings/[bookingId]/installments/page.tsx
"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useBooking } from "@/features/bookings"
import { InstallmentScheduleForm } from "@/features/installments/components/installment-schedule-form"
import { InstallmentScheduleTable } from "@/features/installments/components/installment-schedule-table"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft } from "lucide-react"

interface Props { params: Promise<{ bookingId: string }> }

export default function AdminInstallmentSchedulePage({ params }: Props) {
  const { bookingId } = use(params)
  const router = useRouter()
  const { data: booking, isLoading } = useBooking(bookingId)

  if (isLoading) return <p className="p-8 text-muted-foreground">Loading…</p>
  if (!booking)  return <p className="p-8 text-destructive">Booking not found.</p>

  if (booking.status !== "CONFIRMED") {
    return (
      <div className="container max-w-2xl py-8 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 size-4" /> Back
        </Button>
        <p className="text-muted-foreground">
          Installment schedules can only be set for confirmed bookings.
          This booking is currently <strong>{booking.status}</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl space-y-6 py-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 size-4" /> Back
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Installment Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {booking.package.name} — {booking.venue}
        </p>
      </div>

      {/* Existing schedule */}
      <InstallmentScheduleTable bookingId={bookingId} />

      <Separator />

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Set / Replace Schedule</h2>
        <p className="text-sm text-muted-foreground">
          Enter the installment terms agreed in the contract. Saving will
          replace any existing unpaid installments.
        </p>
        <InstallmentScheduleForm
          bookingId={bookingId}
          packagePrice={Number(booking.package.price)}
          onSuccess={() => router.refresh()}
        />
      </div>
    </div>
  )
}
