// app/(pages)/(protected)/(staff)/staff/admin/bookings/[bookingId]/page.tsx
"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useBooking } from "@/features/bookings"
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge"
import { ConfirmBookingDialog } from "@/features/bookings/components/confirm-booking-dialog"
import { CancelBookingDialog } from "@/features/bookings/components/cancel-booking-dialog"
import { Button } from "@/components/ui/button"
import { EVENT_TYPE_LABELS } from "@/features/bookings"
import { ArrowLeft } from "lucide-react"

interface Props {
  params: Promise<{ bookingId: string }>
}

export default function AdminBookingDetailPage({ params }: Props) {
  const { bookingId } = use(params)
  const router = useRouter()
  const { data: booking, isLoading, isError } = useBooking(bookingId)

  if (isLoading) return <p className="p-8 text-muted-foreground">Loading…</p>
  if (isError || !booking) return <p className="p-8 text-destructive">Booking not found.</p>

  const eventDate = new Date(booking.eventDate).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 size-4" /> Back
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{EVENT_TYPE_LABELS[booking.eventType]}</h1>
        <BookingStatusBadge status={booking.status} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <dt className="text-muted-foreground">Client</dt>
        <dd>{booking.client.fullName}</dd>

        <dt className="text-muted-foreground">Event Date</dt>
        <dd>{eventDate}</dd>

        <dt className="text-muted-foreground">Venue</dt>
        <dd>{booking.venue}</dd>

        <dt className="text-muted-foreground">Guest Count</dt>
        <dd>{booking.guestCount}</dd>

        <dt className="text-muted-foreground">Package</dt>
        <dd>{booking.package.name}</dd>

        {booking.notes && (
          <>
            <dt className="text-muted-foreground">Notes</dt>
            <dd>{booking.notes}</dd>
          </>
        )}

        {booking.cancellationReason && (
          <>
            <dt className="text-muted-foreground">Cancellation Reason</dt>
            <dd className="text-destructive">{booking.cancellationReason}</dd>
          </>
        )}
      </dl>

      {booking.status === "PENDING" && (
        <div className="flex gap-3">
          <ConfirmBookingDialog
            bookingId={booking.id}
            eventDate={booking.eventDate}
            onSuccess={() => router.back()}
          />
          <CancelBookingDialog bookingId={booking.id} onSuccess={() => router.back()} />
        </div>
      )}
    </div>
  )
}
