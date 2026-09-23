// app/(pages)/(protected)/staff/coordinator/bookings/[bookingId]/page.tsx
//
// Coordinator booking detail (FINDINGS.md #6). The coordinator bookings list, dashboard, payment detail and
// "My assignments" all link here, but the page did not exist (→ 404). This is a deliberately BASIC page built
// from the existing feature components; admin-only actions (manual payment, installment schedule) stay on the
// admin page, and every action here is one the API already allows a COORDINATOR to perform.
"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { EVENT_TYPE_LABELS, useBooking } from "@/features/bookings"
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge"
import { BookingHistoryTimeline } from "@/features/bookings/components/booking-history-timeline"
import { CancelBookingDialog } from "@/features/bookings/components/cancel-booking-dialog"
import { ConfirmBookingDialog } from "@/features/bookings/components/confirm-booking-dialog"
import { ContractTermsForm } from "@/features/bookings/components/contract-terms-form"
import { useBookingPayments } from "@/features/payments"
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge"
import { BookingStaffPanel } from "@/features/staff-assignments/components/booking-staff-panel"
import { BookingVendorPanel } from "@/features/vendors/components/booking-vendor-panel"
import { ArrowLeft, CalendarDays } from "lucide-react"

interface Props { params: Promise<{ bookingId: string }> }

const peso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(n)
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })

export default function CoordinatorBookingDetailPage({ params }: Props) {
  const { bookingId } = use(params)
  const router = useRouter()
  const { data: booking, isLoading, isError } = useBooking(bookingId)
  const { data: payments } = useBookingPayments(bookingId)

  if (isLoading) return <div className="h-40 rounded-xl bg-border/30 animate-pulse" />
  if (isError || !booking) {
    return (
      <div className="rounded-xl border border-border bg-white p-6 text-center text-[13px] text-text-muted">
        Booking not found.
      </div>
    )
  }

  const eventLabel = EVENT_TYPE_LABELS[booking.eventType as keyof typeof EVENT_TYPE_LABELS] ?? booking.eventType
  const canDecide = booking.status === "PENDING" || booking.status === "CANCELLATION_REQUESTED"

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" size="sm" className="w-fit" onClick={() => router.push("/staff/coordinator/bookings")}>
        <ArrowLeft size={14} aria-hidden="true" /> All bookings
      </Button>

      <PageHeader
        title={`${eventLabel} — ${booking.client.fullName}`}
        subtitle={`${fmtDate(booking.eventDate)} · ${booking.venue} · ${booking.guestCount} guests`}
        icon={CalendarDays}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BookingStatusBadge status={booking.status} />
            {booking.status === "PENDING" && <ConfirmBookingDialog bookingId={booking.id} eventDate={booking.eventDate} />}
            {canDecide && <CancelBookingDialog bookingId={booking.id} />}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <section className="rounded-xl border border-border bg-white p-5 space-y-2 text-[13px]">
            <h3 className="font-semibold text-text-main">Booking</h3>
            <p><span className="text-text-muted">Package:</span> {booking.package.name}</p>
            <p><span className="text-text-muted">Agreed price:</span> {peso(Number(booking.agreedPrice))}</p>
            {booking.cancellationRequestReason && booking.status === "CANCELLATION_REQUESTED" && (
              <p><span className="text-text-muted">Cancellation requested:</span> {booking.cancellationRequestReason}</p>
            )}
          </section>

          {booking.status === "PENDING" && <ContractTermsForm booking={booking} />}

          <section className="rounded-xl border border-border bg-white p-5 space-y-2">
            <h3 className="text-[13px] font-semibold text-text-main">Payments</h3>
            {(payments ?? []).length === 0 && <p className="text-[12px] text-text-muted">No payments yet.</p>}
            {(payments ?? []).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => router.push(`/staff/coordinator/payments/${p.id}`)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-[12px] hover:bg-background-blush"
              >
                <span>{p.paymentType.replace("_", " ").toLowerCase()} · {peso(Number(p.amount))}</span>
                <PaymentStatusBadge status={p.status} />
              </button>
            ))}
          </section>

          <section className="rounded-xl border border-border bg-white p-5">
            <h3 className="mb-3 text-[13px] font-semibold text-text-main">History</h3>
            <BookingHistoryTimeline bookingId={booking.id} />
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <BookingStaffPanel bookingId={booking.id} />
          <BookingVendorPanel booking={booking} />
        </div>
      </div>
    </div>
  )
}
