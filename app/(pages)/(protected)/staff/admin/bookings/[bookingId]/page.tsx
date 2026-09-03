// app/(pages)/(protected)/staff/admin/bookings/[bookingId]/page.tsx
"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useBooking, EVENT_TYPE_LABELS } from "@/features/bookings"
import { useBookingPayments } from "@/features/payments"
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge"
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge"
import { ConfirmBookingDialog } from "@/features/bookings/components/confirm-booking-dialog"
import { CancelBookingDialog } from "@/features/bookings/components/cancel-booking-dialog"
import { ContractTermsForm } from "@/features/bookings/components/contract-terms-form"
import { PaymentSummary } from "@/features/bookings/components/payment-summary"
import { BookingVendorPanel } from "@/features/vendors/components/booking-vendor-panel"
import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft, CalendarDays, MapPin, Users, Package,
  User, CreditCard, ChevronRight, CheckCircle2,
  Clock, AlertCircle, Phone, Wallet, XCircle,
  Navigation, ExternalLink, Banknote,
} from "lucide-react"
import { PAYMENT_METHOD_LABELS } from "@/features/payments"
import { useUpdateBookingStatus } from "@/features/bookings/bookings.hooks"
import { SPRING } from "@/lib/framer/framer-utils"

interface Props { params: Promise<{ bookingId: string }> }

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP", minimumFractionDigits: 0,
  }).format(n)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  })

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

  const agreedPrice   = Number(booking.agreedPrice)
  const depositAmount = booking.depositAmount ? Number(booking.depositAmount) : null
  const termsSet      = !!(booking.paymentPlan && booking.depositAmount)
  const isCancelRequested = booking.status === "CANCELLATION_REQUESTED"

  // Latest verified deposit
  const verifiedDeposit = payments
    ?.filter((p) => p.paymentType === "DEPOSIT" && p.status === "VERIFIED")
    .at(0)
  // Latest submitted deposit (for review CTA)
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

      {/* Cancellation request alert */}
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
            <CancelBookingDialog bookingId={booking.id} onSuccess={() => router.back()} />
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button variant="outline" size="sm">
                  <XCircle size={13} aria-hidden="true" /> Decline
                </Button>
              }>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Decline cancellation request?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The booking will be restored to Confirmed status.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Go back</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={statusPending}
                    onClick={() => updateStatus(
                      { id: bookingId, input: { status: "CONFIRMED" } as any },
                      { onSuccess: () => router.refresh() },
                    )}
                  >
                    {statusPending ? "Processing…" : "Decline & keep confirmed"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">

        {/* ── Left column ── */}
        <div className="flex flex-col gap-5">

          {/* Booking details */}
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
                    href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5"
                  >
                    {hasPin
                      ? <><Navigation size={10} aria-hidden="true" /> View pinned location</>
                      : <><ExternalLink size={10} aria-hidden="true" /> Search on Maps</>}
                  </a>
                </div>
              </div>

              {/* Client phone — tappable */}
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

            {/* Price */}
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
            </div>

            {/* Map preview */}
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

            {/* Customizations */}
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

            {/* Staff note */}
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

          {/* ── Vendor coordination panel (FR-19 / Module 4) ── */}
          <BookingVendorPanel booking={booking} />

          {/* ── Payment summary + transaction history (staff variant) ── */}
          <PaymentSummary
            booking={booking}
            variant="staff"
            onViewPayment={(id) => router.push(`/staff/admin/payments/${id}`)}
          />
        </div>

        {/* ── Right column: actions ── */}
        <div className="flex flex-col gap-4">

          {/* Contract terms form — PENDING only */}
          {booking.status === "PENDING" && (
            <ContractTermsForm booking={booking} onSuccess={() => router.refresh()} />
          )}

          {/* Deposit status */}
          <div className="rounded-xl border border-border bg-white p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Deposit status
            </p>
            {!verifiedDeposit && !submittedDeposit ? (
              <div className="flex items-center gap-2 text-[13px] text-text-muted">
                <Clock size={14} aria-hidden="true" />
                {termsSet
                  ? `Awaiting client — ${depositAmount ? fmt(depositAmount) : "amount set"}`
                  : "Set contract terms first"}
              </div>
            ) : (
              <div className="space-y-2">
                {verifiedDeposit && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-text-main">
                        {fmt(Number(verifiedDeposit.amount))}
                      </span>
                      <PaymentStatusBadge status="VERIFIED" />
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
                      <PaymentStatusBadge status="SUBMITTED" />
                    </div>
                    <p className="text-[12px] text-text-muted">
                      {PAYMENT_METHOD_LABELS[submittedDeposit.method]}
                      {submittedDeposit.referenceNumber && ` · ${submittedDeposit.referenceNumber}`}
                    </p>
                    <Button
                      size="sm" className="w-full mt-1"
                      onClick={() => router.push(`/staff/admin/payments/${submittedDeposit.id}`)}
                    >
                      Review deposit <ChevronRight size={13} aria-hidden="true" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Manual payment button */}
          {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
            <button
              onClick={() => router.push(`/staff/admin/bookings/${bookingId}/manual-payment`)}
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

          {/* Installments CTA — CONFIRMED + INSTALLMENT plan */}
          {booking.status === "CONFIRMED" && booking.paymentPlan === "INSTALLMENT" && (
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

          {/* Full payment info — CONFIRMED + FULL plan */}
          {booking.status === "CONFIRMED" && booking.paymentPlan === "FULL" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Wallet size={14} className="text-emerald-600" aria-hidden="true" />
                <p className="text-[12px] font-semibold text-emerald-700">Full payment plan</p>
              </div>
              {depositAmount && (
                <p className="text-[12px] text-emerald-600">
                  Balance: {fmt(agreedPrice - (verifiedDeposit ? Number(verifiedDeposit.amount) : 0))}
                </p>
              )}
              {booking.fullPaymentDueDate && (
                <p className="text-[11px] text-emerald-600">
                  Due by {fmtDate(booking.fullPaymentDueDate)}
                </p>
              )}
            </div>
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
                  onSuccess={() => router.back()}
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
