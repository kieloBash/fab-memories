// app/(pages)/(protected)/staff/coordinator/bookings/[bookingId]/page.tsx
"use client"

/**
 * Coordinator-facing booking detail.
 *
 * UPDATED — payment actions restored: "Review deposit" and "Record manual
 * payment" now link to real coordinator-scoped routes
 * (/staff/coordinator/payments/[id] and .../manual-payment), which didn't
 * exist when this page was first built. Coordinators already had this
 * authority at the API level (requireRole(["ADMIN","COORDINATOR"]) on the
 * verify/manual-payment routes) — this page is what makes it reachable.
 *
 * STILL RESTRICTED — per product decision, coordinators get view +
 * vendor/staff assignment + payment authority, but NOT booking
 * status-changing actions:
 *   NOT ALLOWED — ContractTermsForm, ConfirmBookingDialog, CancelBookingDialog,
 *                 declining a cancellation request
 */

import { use } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useBooking, EVENT_TYPE_LABELS } from "@/features/bookings"
import { useBookingPayments } from "@/features/payments"
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge"
import { PaymentSummary } from "@/features/bookings/components/payment-summary"
import { BookingVendorPanel } from "@/features/vendors/components/booking-vendor-panel"
import { BookingStaffPanel } from "@/features/staff-assignments/components/booking-staff-panel"
import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft, CalendarDays, MapPin, Users, Package,
  User, CreditCard, ChevronRight, CheckCircle2, Clock, AlertCircle,
  Phone, Wallet, Navigation, ExternalLink, Eye, Banknote,
} from "lucide-react"
import { PAYMENT_METHOD_LABELS } from "@/features/payments"

interface Props { params: Promise<{ bookingId: string }> }

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP", minimumFractionDigits: 0,
  }).format(n)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  })

export default function CoordinatorBookingDetailPage({ params }: Props) {
  const { bookingId } = use(params)
  const router = useRouter()

  const { data: booking, isLoading, isError } = useBooking(bookingId)
  const { data: payments } = useBookingPayments(bookingId)

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

  const agreedPrice   = Number(booking.agreedPrice)
  const isCancelRequested = booking.status === "CANCELLATION_REQUESTED"

  const verifiedDeposit = payments
    ?.filter((p) => p.paymentType === "DEPOSIT" && p.status === "VERIFIED")
    .at(0)
  const submittedDeposit = payments
    ?.filter((p) => p.paymentType === "DEPOSIT" && p.status === "SUBMITTED")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .at(0)

  const hasPin = !!(booking.venueLatitude && booking.venueLongitude)
  const mapsUrl = hasPin
    ? `https://www.google.com/maps?q=${booking.venueLatitude},${booking.venueLongitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(booking.venue)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
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

      {/* Scope notice — booking status/contract terms remain admin-only */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background-blush px-3 py-2">
        <Eye size={13} className="text-text-muted shrink-0" aria-hidden="true" />
        <p className="text-[11px] text-text-muted">
          Contract terms and booking status (confirm/cancel) are managed by an administrator.
          You can assign vendors and staff, and verify or record payments below.
        </p>
      </div>

      {isCancelRequested && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-5">
          <AlertCircle size={18} className="text-orange-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[14px] font-semibold text-orange-800">Client requested cancellation</p>
            <p className="text-[13px] text-orange-700 mt-1">{booking.cancellationRequestReason}</p>
            {booking.cancellationRequestedAt && (
              <p className="text-[11px] text-orange-500 mt-1">
                Requested {fmtDate(booking.cancellationRequestedAt)} — an administrator needs to act on this.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">

        {/* ── Left column ── */}
        <div className="flex flex-col gap-5">

          <div className="rounded-xl border border-border bg-white p-5 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Booking details
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: User,        label: "Client",     value: booking.client.fullName },
                { icon: CalendarDays,label: "Event date", value: fmtDate(booking.eventDate) },
                { icon: Users,       label: "Guests",     value: `${booking.guestCount} guests` },
                { icon: Package,     label: "Package",    value: booking.package.name },
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
                    href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5"
                  >
                    {hasPin
                      ? <><Navigation size={10} aria-hidden="true" /> View pinned location</>
                      : <><ExternalLink size={10} aria-hidden="true" /> Search on Maps</>}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                  <Phone size={14} className="text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[11px] text-text-muted">Client mobile</p>
                  <a
                    href={`tel:${booking.clientPhone}`}
                    className="text-[13px] font-medium text-primary hover:underline underline-offset-4"
                  >
                    {booking.clientPhone}
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-text-muted">Agreed price</span>
                  {booking.isProvincial && <Badge variant="warning">Provincial</Badge>}
                </div>
                <span className="text-[16px] font-bold tracking-tighter text-text-main">
                  {fmt(agreedPrice)}
                </span>
              </div>
              {booking.paymentPlan && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-text-muted">Payment plan</span>
                  <span className="font-medium text-text-main flex items-center gap-1">
                    {booking.paymentPlan === "FULL"
                      ? <><Wallet size={12} aria-hidden="true" /> Full payment</>
                      : <><CreditCard size={12} aria-hidden="true" /> Installments</>}
                  </span>
                </div>
              )}
              {!booking.paymentPlan && (
                <p className="text-[11px] text-text-muted italic">
                  Contract terms not yet set — an administrator will discuss this with the client.
                </p>
              )}
            </div>

            {hasPin && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
              <div className="overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${booking.venueLatitude},${booking.venueLongitude}&zoom=15&size=600x160&scale=2&markers=color:0xF564A9%7C${booking.venueLatitude},${booking.venueLongitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                  alt="Venue map"
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {booking.packageCustomizations?.length > 0 && (
              <div>
                <p className="text-[11px] text-text-muted mb-1.5">Customizations</p>
                <div className="flex flex-wrap gap-1">
                  {booking.packageCustomizations.map((c) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
              </div>
            )}

            {booking.staffNote && (
              <div className="rounded-lg bg-background-blush p-3">
                <p className="text-[11px] text-text-muted mb-0.5">Staff note (internal)</p>
                <p className="text-[13px] text-text-sub italic">{booking.staffNote}</p>
              </div>
            )}

            {booking.notes && (
              <div className="rounded-lg bg-background-blush p-3">
                <p className="text-[11px] text-text-muted mb-0.5">Client notes</p>
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

          <BookingVendorPanel booking={booking} />
          <BookingStaffPanel bookingId={booking.id} />
          <PaymentSummary booking={booking} variant="staff" onViewPayment={(id) => router.push(`/staff/coordinator/payments/${id}`)} />
        </div>

        {/* ── Right column — now includes real payment actions ── */}
        <div className="flex flex-col gap-4">

          <div className="rounded-xl border border-border bg-white p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Deposit status
            </p>
            {!verifiedDeposit && !submittedDeposit ? (
              <div className="flex items-center gap-2 text-[13px] text-text-muted">
                <Clock size={14} aria-hidden="true" />
                {booking.paymentPlan ? "Awaiting client payment" : "Contract terms not yet set"}
              </div>
            ) : (
              <div className="space-y-2">
                {verifiedDeposit && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-text-main">
                        {fmt(Number(verifiedDeposit.amount))}
                      </span>
                      <Badge variant="success">Verified</Badge>
                    </div>
                    <p className="text-[12px] text-text-muted">
                      {PAYMENT_METHOD_LABELS[verifiedDeposit.method]}
                      {verifiedDeposit.referenceNumber && ` · ${verifiedDeposit.referenceNumber}`}
                    </p>
                    <div className="flex items-center gap-1.5 text-[12px] text-emerald-600">
                      <CheckCircle2 size={13} aria-hidden="true" /> Booking confirmed
                    </div>
                  </>
                )}
                {submittedDeposit && !verifiedDeposit && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-text-main">
                        {fmt(Number(submittedDeposit.amount))}
                      </span>
                      <Badge variant="warning">Submitted</Badge>
                    </div>
                    <p className="text-[12px] text-text-muted">
                      {PAYMENT_METHOD_LABELS[submittedDeposit.method]}
                      {submittedDeposit.referenceNumber && ` · ${submittedDeposit.referenceNumber}`}
                    </p>
                    {/* Now a real, working destination */}
                    <Button
                      size="sm" className="w-full mt-1"
                      onClick={() => router.push(`/staff/coordinator/payments/${submittedDeposit.id}`)}
                    >
                      Review deposit <ChevronRight size={13} aria-hidden="true" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Manual payment button — now a real destination */}
          {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
            <button
              onClick={() => router.push(`/staff/coordinator/bookings/${bookingId}/manual-payment`)}
              className="flex items-center justify-between rounded-xl border border-border bg-white p-4 hover:border-border-strong hover:bg-primary-soft/20 transition-colors text-left w-full"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center">
                  <Banknote size={14} className="text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-text-main">Record manual payment</p>
                  <p className="text-[11px] text-text-muted">Cash, walk-in, face-to-face</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-text-muted" aria-hidden="true" />
            </button>
          )}

          {booking.paymentPlan === "FULL" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Wallet size={14} className="text-emerald-600" aria-hidden="true" />
                <p className="text-[12px] font-semibold text-emerald-700">Full payment plan</p>
              </div>
              {booking.fullPaymentDueDate && (
                <p className="text-[11px] text-emerald-600">
                  Due by {fmtDate(booking.fullPaymentDueDate)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
