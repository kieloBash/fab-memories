// app/(pages)/(protected)/staff/admin/bookings/[bookingId]/page.tsx
"use client"

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { EVENT_TYPE_LABELS, useBooking } from "@/features/bookings"
import { useUpdateBookingStatus } from "@/features/bookings/bookings.hooks"
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge"
import { CancelBookingDialog } from "@/features/bookings/components/cancel-booking-dialog"
import { ConfirmBookingDialog } from "@/features/bookings/components/confirm-booking-dialog"
import { PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS, useBookingPayments } from "@/features/payments"
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge"
import { SPRING } from "@/lib/framer/framer-utils"
import { motion } from "framer-motion"
import {
  AlertCircle,
  ArrowLeft, CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
  MapPin,
  Navigation,
  Package, User,
  Users,
  XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { use } from "react"

interface Props { params: Promise<{ bookingId: string }> }

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(n)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })

export default function AdminBookingDetailPage({ params }: Props) {
  const { bookingId } = use(params)
  const router = useRouter()

  const { data: booking, isLoading, isError } = useBooking(bookingId)
  const { data: payments } = useBookingPayments(bookingId)
  const { mutate: updateStatus, isPending: statusPending } = useUpdateBookingStatus()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl border border-border bg-white animate-pulse" />
        ))}
      </div>
    )
  }
  if (isError || !booking) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-[13px] text-red-600">
        Booking not found.
      </div>
    )
  }

  const deposit = payments
    ?.filter((p) => p.paymentType === "DEPOSIT")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  const hasPin = !!(booking.venueLatitude && booking.venueLongitude)
  const mapsUrl = hasPin
    ? `https://www.google.com/maps?q=${booking.venueLatitude},${booking.venueLongitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(booking.venue)}`

  const isCancelRequested = booking.status === "CANCELLATION_REQUESTED"

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6"
    >
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
        <ArrowLeft size={15} aria-hidden="true" /> Back
      </Button>

      <PageHeader
        title={EVENT_TYPE_LABELS[booking.eventType]}
        icon={CalendarDays}
        actions={<BookingStatusBadge status={booking.status} />}
      />

      {/* Cancellation request alert — prominent for staff */}
      {isCancelRequested && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-5">
          <AlertCircle size={18} className="text-orange-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-orange-800">Client requested cancellation</p>
            <p className="text-[13px] text-orange-700 mt-1">{booking.cancellationRequestReason}</p>
            {booking.cancellationRequestedAt && (
              <p className="text-[11px] text-orange-500 mt-1">
                Requested {fmtDate(booking.cancellationRequestedAt)}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {/* Approve — actually cancel the booking */}
            <CancelBookingDialog bookingId={booking.id} onSuccess={() => router.back()} />
            {/* Decline — restore to CONFIRMED */}
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button variant="outline" size="sm">
                  <XCircle size={13} aria-hidden="true" /> Decline request
                </Button>
              }>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Decline cancellation request?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The booking will be restored to Confirmed status and the client will
                    need to contact you directly if they still wish to cancel.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Go back</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={statusPending}
                    onClick={() =>
                      updateStatus(
                        { id: bookingId, input: { status: "CONFIRMED" } as any },
                        { onSuccess: () => router.refresh() },
                      )
                    }
                  >
                    {statusPending ? "Processing…" : "Decline & keep confirmed"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">

        {/* ── Left: booking details ── */}
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-white p-5 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Booking details
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: User, label: "Client", value: booking.client.fullName },
                { icon: CalendarDays, label: "Event date", value: fmtDate(booking.eventDate) },
                { icon: Users, label: "Guests", value: `${booking.guestCount} guests` },
                { icon: Package, label: "Package", value: booking.package.name },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                    <Icon size={14} className="text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[11px] text-text-muted">{label}</p>
                    <p className="text-[13px] font-medium text-text-main">{value}</p>
                  </div>
                </div>
              ))}

              {/* Venue with map */}
              <div className="flex items-start gap-3 sm:col-span-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                  <MapPin size={14} className="text-primary" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-text-muted">Venue</p>
                  <p className="text-[13px] font-medium text-text-main">
                    {booking.venueFormattedAddress ?? booking.venue}
                  </p>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5"
                  >
                    {hasPin
                      ? <><Navigation size={10} aria-hidden="true" /> View pinned location</>
                      : <><ExternalLink size={10} aria-hidden="true" /> Search on Maps</>}
                  </a>
                </div>
              </div>
            </div>

            {/* Map preview */}
            {hasPin && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
              <div className="overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${booking.venueLatitude},${booking.venueLongitude}&zoom=15&size=600x180&scale=2&markers=color:0xF564A9%7C${booking.venueLatitude},${booking.venueLongitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                  alt="Venue map"
                  className="w-full h-36 object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {/* Customizations */}
            {booking.packageCustomizations?.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="text-[11px] text-text-muted mb-1.5">Package customizations</p>
                <div className="flex flex-wrap gap-1">
                  {booking.packageCustomizations.map((c) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="text-[12px] text-text-muted">Package price</span>
              <span className="text-[16px] font-bold tracking-tighter text-text-main">
                {fmt(Number(booking.package.price))}
              </span>
            </div>

            {booking.notes && (
              <div className="rounded-lg bg-background-blush p-3">
                <p className="text-[11px] text-text-muted mb-0.5">Notes</p>
                <p className="text-[13px] text-text-sub">{booking.notes}</p>
              </div>
            )}

            {booking.cancellationReason && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-semibold text-red-700">Cancellation reason</p>
                  <p className="text-[13px] text-red-600">{booking.cancellationReason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Payment history */}
          {payments && payments.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-5 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Payment history
              </p>
              <div className="space-y-2">
                {payments.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/staff/admin/payments/${p.id}`)}
                    className="w-full flex items-center justify-between rounded-xl border border-border bg-background-blush px-4 py-3 hover:border-border-strong hover:bg-primary-soft/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard size={14} className="text-primary shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-[12px] font-semibold text-text-main">
                          {PAYMENT_TYPE_LABELS[p.paymentType]}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          {PAYMENT_METHOD_LABELS[p.method]} · {fmt(Number(p.amount))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PaymentStatusBadge status={p.status} />
                      <ChevronRight size={13} className="text-text-muted" aria-hidden="true" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: actions panel ── */}
        <div className="flex flex-col gap-4">
          {/* Deposit status */}
          <div className="rounded-xl border border-border bg-white p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Deposit status
            </p>
            {!deposit ? (
              <div className="flex items-center gap-2 text-[13px] text-text-muted">
                <Clock size={14} aria-hidden="true" /> Awaiting client submission
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-text-main">
                    {fmt(Number(deposit.amount))}
                  </span>
                  <PaymentStatusBadge status={deposit.status} />
                </div>
                <p className="text-[12px] text-text-muted">
                  {PAYMENT_METHOD_LABELS[deposit.method]}
                  {deposit.referenceNumber && ` · ${deposit.referenceNumber}`}
                </p>
                {deposit.status === "SUBMITTED" && (
                  <Button
                    size="sm" className="w-full mt-1"
                    onClick={() => router.push(`/staff/admin/payments/${deposit.id}`)}
                  >
                    Review deposit <ChevronRight size={13} aria-hidden="true" />
                  </Button>
                )}
                {deposit.status === "VERIFIED" && (
                  <div className="flex items-center gap-1.5 text-[12px] text-emerald-600">
                    <CheckCircle2 size={13} aria-hidden="true" /> Booking confirmed
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Installment schedule CTA */}
          {booking.status === "CONFIRMED" && (
            <button
              onClick={() => router.push(`/staff/admin/bookings/${bookingId}/installments`)}
              className="flex items-center justify-between rounded-xl border border-border bg-white p-4 hover:border-border-strong hover:bg-primary-soft/20 transition-colors text-left w-full"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center">
                  <CreditCard size={14} className="text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-text-main">Installment schedule</p>
                  <p className="text-[11px] text-text-muted">Set or update payment schedule</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-text-muted" aria-hidden="true" />
            </button>
          )}

          {/* Booking actions — PENDING */}
          {booking.status === "PENDING" && (
            <div className="rounded-xl border border-border bg-white p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Actions
              </p>
              <div className="flex flex-col gap-2">
                <ConfirmBookingDialog
                  bookingId={booking.id}
                  eventDate={booking.eventDate}
                  onSuccess={() => router.refresh()}
                />
                <CancelBookingDialog bookingId={booking.id} onSuccess={() => router.back()} />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
