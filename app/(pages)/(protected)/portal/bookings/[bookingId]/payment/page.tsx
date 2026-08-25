// app/(pages)/(protected)/portal/bookings/[bookingId]/payment/page.tsx
"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, CheckCircle2, Clock, AlertCircle, CreditCard, ChevronRight,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useBooking } from "@/features/bookings"
import { InstallmentScheduleTable } from "@/features/installments/components/installment-schedule-table"
import {
  PAYMENT_METHOD_LABELS,
  useBookingPayments,
} from "@/features/payments"
import { PaymentProofUpload } from "@/features/payments/components/payment-proof-upload"
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge"
import { cn } from "@/lib/utils"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  })

interface Props { params: Promise<{ bookingId: string }> }

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-all",
        done && "bg-emerald-500 text-white",
        active && !done && "bg-primary text-white ring-4 ring-primary/20",
        !active && !done && "bg-border text-text-muted",
      )}>
        {done ? <CheckCircle2 size={14} /> : active ? "●" : "○"}
      </div>
      <span className={cn(
        "text-[10px] font-medium tracking-wide text-center max-w-[64px] leading-tight",
        done || active ? "text-text-main" : "text-text-muted",
      )}>
        {label}
      </span>
    </div>
  )
}

export default function ClientPaymentPage({ params }: Props) {
  const { bookingId } = use(params)
  const router = useRouter()

  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const { data: payments, isLoading: paymentsLoading, refetch } = useBookingPayments(bookingId)

  const [payingInstallment, setPayingInstallment] = useState<{
    installmentId: string
    amount: number
  } | null>(null)

  if (bookingLoading || paymentsLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-white animate-pulse" />
        ))}
      </div>
    )
  }

  if (!booking) {
    return <p className="text-[13px] text-red-600">Booking not found.</p>
  }

  const packagePrice = Number(booking.package.price)

  // FIX: payments are ordered newest-first (DESC). Filter DEPOSIT payments and
  // take the first one — this is always the latest submission, not an old FLAGGED one.
  const depositPayments = payments?.filter((p) => p.paymentType === "DEPOSIT") ?? []
  const depositPayment = depositPayments[0] // latest DEPOSIT (undefined if none)

  const depositVerified = depositPayment?.status === "VERIFIED"
  const depositSubmitted = depositPayment?.status === "SUBMITTED"
  const depositFlagged = depositPayment?.status === "FLAGGED"

  // Show the deposit form when:
  // - No deposit has ever been submitted, OR
  // - The latest deposit was FLAGGED (needs resubmission)
  const showDepositForm = !depositPayment || depositFlagged

  const depositPaid = depositVerified ? Number(depositPayment.amount) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-6 max-w-2xl"
    >
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
        <ArrowLeft size={15} aria-hidden="true" />
        Back to booking
      </Button>

      <div>
        <h1 className="text-[22px] font-bold tracking-tighter text-text-main">Payments</h1>
        <p className="text-[13px] text-text-muted mt-0.5">
          {booking.package.name} — {fmt(packagePrice)}
        </p>
      </div>

      {/* Progress stepper */}
      <div className="rounded-xl border border-border bg-white p-5">
        <div className="flex items-start gap-0">
          <StepDot done={depositVerified} active={!depositVerified} label="Deposit submitted" />
          <div className={cn("flex-1 h-px mt-3.5 mx-2 transition-colors", depositVerified ? "bg-emerald-400" : "bg-border")} aria-hidden="true" />
          <StepDot done={depositVerified} active={depositVerified} label="Booking confirmed" />
          <div className={cn("flex-1 h-px mt-3.5 mx-2 transition-colors", depositVerified ? "bg-primary/40" : "bg-border")} aria-hidden="true" />
          <StepDot done={false} active={depositVerified} label="Installments" />
        </div>
      </div>

      {/* Deposit section */}
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-primary" aria-hidden="true" />
            <h2 className="text-[14px] font-semibold tracking-tight text-text-main">
              Reservation deposit
            </h2>
          </div>
          {depositPayment && <PaymentStatusBadge status={depositPayment.status} />}
        </div>

        <div className="p-5 space-y-4">
          {/* Latest deposit details */}
          {depositPayment && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {[
                { label: "Amount", value: fmt(Number(depositPayment.amount)) },
                { label: "Method", value: PAYMENT_METHOD_LABELS[depositPayment.method] },
                ...(depositPayment.referenceNumber
                  ? [{ label: "Reference", value: depositPayment.referenceNumber }]
                  : []),
                ...(depositPayment.submittedAt
                  ? [{ label: "Submitted", value: fmtDate(depositPayment.submittedAt) }]
                  : []),
                ...(depositPayment.verifiedAt
                  ? [{ label: "Verified on", value: fmtDate(depositPayment.verifiedAt) }]
                  : []),
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] text-text-muted">{label}</p>
                  <p className="text-[13px] font-medium text-text-main">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Previous flagged deposit — show history link if there were prior attempts */}
          {depositFlagged && depositPayments.length > 1 && (
            <p className="text-[11px] text-text-muted">
              {depositPayments.length - 1} previous submission{depositPayments.length > 2 ? "s" : ""} flagged.
            </p>
          )}

          {/* Status banners */}
          <AnimatePresence mode="wait">
            {depositSubmitted && (
              <motion.div
                key="submitted"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"
              >
                <Clock size={14} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-[12px] font-semibold text-amber-700">Under review</p>
                  <p className="text-[12px] text-amber-600">
                    Your deposit proof has been submitted. Your booking will be confirmed once verified.
                  </p>
                </div>
              </motion.div>
            )}

            {depositFlagged && (
              <motion.div
                key="flagged"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
              >
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-[12px] font-semibold text-red-700">Deposit flagged</p>
                  <p className="text-[12px] text-red-600">
                    {depositPayment?.verificationNote || "Your deposit was flagged. Please resubmit a valid proof of payment."}
                  </p>
                </div>
              </motion.div>
            )}

            {depositVerified && (
              <motion.div
                key="verified"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3"
              >
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-[12px] font-semibold text-emerald-700">Deposit verified</p>
                  <p className="text-[12px] text-emerald-600">
                    Your booking is confirmed. You can now view and settle your installment schedule below.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {showDepositForm && (
            <div className="border-t border-border pt-4">
              {/* <p className="text-[13px] font-medium text-text-main mb-1">
                Submit reservation deposit
              </p>
              <p className="text-[12px] text-text-muted mb-3">
                Upload your proof of deposit. Your booking will be confirmed once verified by staff.
              </p> */}
              <PaymentProofUpload
                bookingId={bookingId}
                paymentType="DEPOSIT"
                defaultAmount={Math.round(packagePrice * 0.3)}
                onSuccess={() => refetch()}
              />
            </div>
          )}
        </div>
      </div>

      {/* Installment section — only after deposit verified */}
      <AnimatePresence>
        {depositVerified && (
          <motion.div
            key="installments"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border border-border bg-white overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <ChevronRight size={16} className="text-primary" aria-hidden="true" />
              <h2 className="text-[14px] font-semibold tracking-tight text-text-main">
                Installment schedule
              </h2>
            </div>
            <div className="p-5">
              <InstallmentScheduleTable
                bookingId={bookingId}
                packagePrice={packagePrice}
                depositPaid={depositPaid}
                onPayInstallment={(installmentId, amount) =>
                  setPayingInstallment({ installmentId, amount })
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Installment payment dialog */}
      <Dialog
        open={!!payingInstallment}
        onOpenChange={(open) => { if (!open) setPayingInstallment(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit installment payment</DialogTitle>
          </DialogHeader>
          {payingInstallment && (
            <PaymentProofUpload
              bookingId={bookingId}
              paymentType="INSTALLMENT"
              installmentId={payingInstallment.installmentId}
              defaultAmount={payingInstallment.amount}
              onSuccess={() => {
                setPayingInstallment(null)
                refetch()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
