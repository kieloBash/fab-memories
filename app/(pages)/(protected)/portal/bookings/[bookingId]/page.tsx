// app/(pages)/(protected)/portal/bookings/[bookingId]/page.tsx
"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useBooking, EVENT_TYPE_LABELS } from "@/features/bookings"
import { useBookingPayments } from "@/features/payments"
import { useInstallments } from "@/features/installments/installments.hooks"
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge"
import { PaymentSummary } from "@/features/bookings/components/payment-summary"
import { WithdrawBookingDialog } from "@/features/bookings/components/withdraw-booking-dialog"
import { CancelRequestDialog } from "@/features/bookings/components/cancel-request-dialog"
import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { VENDOR_CATEGORY_ICONS, VENDOR_CATEGORY_LABELS } from "@/features/vendors"
import {
  ArrowLeft, CalendarDays, MapPin, Users, Package,
  CheckCircle2, AlertCircle, CreditCard, ChevronRight,
  Phone, Clock, Wallet, Edit3, Store,
} from "lucide-react"
import { cn } from "@/lib/utils"
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

function JourneyStep({ step, label, sublabel, status }: {
  step: number; label: string; sublabel: string
  status: "done" | "active" | "pending"
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
        status === "done"    && "bg-emerald-500 text-white",
        status === "active"  && "bg-primary text-white",
        status === "pending" && "bg-border text-text-muted border border-border",
      )}>
        {status === "done" ? <CheckCircle2 size={15} aria-hidden="true" /> : step}
      </div>
      <div className="pt-0.5 min-w-0">
        <p className={cn(
          "text-[13px] font-semibold tracking-tight",
          status === "pending" ? "text-text-muted" : "text-text-main",
        )}>{label}</p>
        <p className="text-[11px] text-text-muted leading-relaxed">{sublabel}</p>
      </div>
    </div>
  )
}

export default function ClientBookingDetailPage({ params }: Props) {
  const { bookingId } = use(params)
  const router        = useRouter()

  const { data: booking, isLoading, isError } = useBooking(bookingId)
  const { data: payments }        = useBookingPayments(bookingId)
  const { data: installmentData } = useInstallments(bookingId)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-white animate-pulse" />
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

  // Payment state
  const depositPayments = payments
    ?.filter((p) => p.paymentType === "DEPOSIT")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) ?? []
  const deposit         = depositPayments[0]
  const depositVerified = deposit?.status === "VERIFIED"
  const depositPending  = deposit?.status === "SUBMITTED"
  const depositFlagged  = deposit?.status === "FLAGGED"

  const totalInst  = installmentData?.installments.length ?? 0
  const paidInst   = installmentData?.installments.filter((i) => i.status === "PAID").length ?? 0
  const termsSet   = !!(booking.paymentPlan && booking.depositAmount)

  const agreedPrice     = Number(booking.agreedPrice)
  const depositAmount   = booking.depositAmount ? Number(booking.depositAmount) : null

  // Journey statuses
  const step1Status: "done" | "active" | "pending" = termsSet ? "done" : "active"
  const step2Status: "done" | "active" | "pending" = termsSet
    ? depositVerified ? "done" : "active"
    : "pending"
  const step3Status: "done" | "active" | "pending" =
    depositVerified && totalInst > 0 && paidInst === totalInst ? "done"
    : depositVerified && (booking.paymentPlan === "FULL" || totalInst > 0) ? "active"
    : "pending"

  const isPending         = booking.status === "PENDING"
  const isConfirmed       = booking.status === "CONFIRMED"
  const isCancelled       = booking.status === "CANCELLED"
  const isCancelRequested = booking.status === "CANCELLATION_REQUESTED"

  // Vendor categories the client requested
  const vendorCategories = booking.vendorCategories ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6 max-w-2xl"
    >
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
        <ArrowLeft size={15} aria-hidden="true" /> Back
      </Button>

      <PageHeader
        title={EVENT_TYPE_LABELS[booking.eventType]}
        icon={CalendarDays}
        actions={
          <div className="flex items-center gap-2">
            <BookingStatusBadge status={booking.status} />
            {isPending && (
              <Button variant="outline" size="sm"
                onClick={() => router.push(`/portal/bookings/${bookingId}/edit`)}>
                <Edit3 size={13} aria-hidden="true" /> Edit
              </Button>
            )}
          </div>
        }
      />

      {/* Cancellation request banner */}
      {isCancelRequested && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800">Cancellation requested</p>
            <p className="text-[12px] text-amber-700 mt-0.5">{booking.cancellationRequestReason}</p>
            <p className="text-[11px] text-amber-600 mt-1">Our team will review and contact you shortly.</p>
          </div>
        </div>
      )}

      {/* ── Journey tracker ── */}
      {!isCancelled && (
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
            Your journey
          </p>
          <div className="space-y-4">
            <JourneyStep
              step={1} label="Contract terms agreed"
              sublabel={
                termsSet
                  ? `${booking.paymentPlan === "FULL" ? "Full payment" : "Installment plan"} · Deposit: ${depositAmount ? fmt(depositAmount) : "—"}`
                  : "Our team will contact you to discuss deposit amount and payment plan"
              }
              status={step1Status}
            />
            <div className="ml-4 w-px h-4 bg-border" aria-hidden="true" />
            <JourneyStep
              step={2} label="Submit reservation deposit"
              sublabel={
                !termsSet        ? "Waiting for contract terms"
                : depositVerified ? `Verified on ${deposit?.verifiedAt ? fmtDate(deposit.verifiedAt) : "—"}`
                : depositPending  ? "Submitted — awaiting staff verification"
                : depositFlagged  ? "Deposit flagged — please resubmit"
                : depositAmount   ? `Pay ${fmt(depositAmount)} to confirm your booking`
                : "Upload your proof of deposit"
              }
              status={step2Status}
            />
            <div className="ml-4 w-px h-4 bg-border" aria-hidden="true" />
            <JourneyStep
              step={3}
              label={booking.paymentPlan === "FULL" ? "Settle remaining balance" : "Settle installments"}
              sublabel={
                !depositVerified ? "Happens after deposit is verified"
                : booking.paymentPlan === "FULL"
                  ? depositAmount ? `Remaining: ${fmt(agreedPrice - (depositVerified ? Number(deposit.amount) : 0))}` : "Pay remaining balance in full"
                  : totalInst === 0 ? "Admin will create your installment schedule"
                  : `${paidInst} of ${totalInst} installments paid`
              }
              status={step3Status}
            />
          </div>

          <Button
            className="w-full mt-2"
            onClick={() => router.push(`/portal/bookings/${bookingId}/payment`)}
            disabled={!termsSet}
          >
            <CreditCard size={15} aria-hidden="true" />
            {depositVerified ? "Manage payments" : termsSet ? "Go to payments" : "Awaiting terms"}
            <ChevronRight size={14} aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* ── Payment summary + transaction history ── */}
      {!isCancelled && termsSet && (
        <PaymentSummary
          booking={booking}
          variant="client"
        />
      )}

      {/* ── Booking details ── */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Booking details
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { icon: CalendarDays, label: "Event date",     value: fmtDate(booking.eventDate) },
            { icon: MapPin,       label: "Venue",          value: booking.venue },
            { icon: Users,        label: "Guest count",    value: `${booking.guestCount} guests` },
            { icon: Package,      label: "Package",        value: booking.package.name },
            { icon: Phone,        label: "Your contact",   value: booking.clientPhone },
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
        </div>

        {/* Agreed price */}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-text-muted">Agreed price</span>
            {booking.isProvincial && <Badge variant="warning">Provincial rate</Badge>}
          </div>
          <span className="text-[16px] font-bold tracking-tighter text-text-main">
            {fmt(agreedPrice)}
          </span>
        </div>

        {/* Payment plan badge */}
        {booking.paymentPlan && (
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-text-muted">Payment plan</span>
            <div className="flex items-center gap-1.5 font-medium text-text-main">
              {booking.paymentPlan === "FULL"
                ? <><Wallet size={13} aria-hidden="true" /> Full payment</>
                : <><CreditCard size={13} aria-hidden="true" /> Installment plan</>}
            </div>
          </div>
        )}

        {/* ── Vendor needs (FR-19) — client read-only view ── */}
        {vendorCategories.length > 0 && (
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex items-center gap-2">
              <Store size={13} className="text-text-muted" aria-hidden="true" />
              <p className="text-[11px] text-text-muted font-medium">Vendor services requested</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {vendorCategories.map((cat) => (
                <span
                  key={cat}
                  className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary"
                >
                  <span aria-hidden="true">{VENDOR_CATEGORY_ICONS[cat]}</span>
                  {VENDOR_CATEGORY_LABELS[cat]}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-text-muted">
              Our team will coordinate these vendor services for your event.
            </p>
          </div>
        )}

        {booking.notes && (
          <div className="rounded-lg bg-background-blush p-3">
            <p className="text-[11px] text-text-muted mb-0.5">Notes</p>
            <p className="text-[13px] text-text-sub">{booking.notes}</p>
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

      {/* Client actions */}
      {(isPending || isConfirmed) && !isCancelRequested && (
        <div className="flex flex-col gap-2">
          {isPending && (
            <WithdrawBookingDialog
              bookingId={bookingId}
              onSuccess={() => router.push("/portal/bookings")}
            />
          )}
          {isConfirmed && (
            <CancelRequestDialog bookingId={bookingId} onSuccess={() => router.refresh()} />
          )}
        </div>
      )}
    </motion.div>
  )
}
