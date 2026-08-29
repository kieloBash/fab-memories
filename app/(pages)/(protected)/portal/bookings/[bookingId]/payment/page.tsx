// app/(pages)/(protected)/portal/bookings/[bookingId]/payment/page.tsx
"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, CheckCircle2, Clock, AlertCircle,
  CreditCard, ChevronRight, Wallet, AlertTriangle,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useBooking, PAYMENT_PLAN_LABELS } from "@/features/bookings"
import { InstallmentScheduleTable } from "@/features/installments/components/installment-schedule-table"
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  useBookingPayments,
} from "@/features/payments"
import { PaymentProofUpload } from "@/features/payments/components/payment-proof-upload"
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge"
import { SPRING } from "@/lib/framer/framer-utils"
import { cn } from "@/lib/utils"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(n)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })

interface Props { params: Promise<{ bookingId: string }> }

export default function ClientPaymentPage({ params }: Props) {
  const { bookingId } = use(params)
  const router = useRouter()

  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const { data: payments, isLoading: paymentsLoading, refetch } = useBookingPayments(bookingId)

  const [payingInstallment, setPayingInstallment] = useState<{
    installmentId: string; amount: number
  } | null>(null)
  const [showFullBalanceForm, setShowFullBalanceForm] = useState(false)

  if (bookingLoading || paymentsLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-white animate-pulse" />
        ))}
      </div>
    )
  }
  if (!booking) return <p className="text-[13px] text-red-600">Booking not found.</p>

  const agreedPrice   = Number(booking.agreedPrice)
  const depositRequired = booking.depositAmount ? Number(booking.depositAmount) : null

  // Latest deposit (newest-first from API)
  const depositPayments = payments?.filter((p) => p.paymentType === "DEPOSIT")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) ?? []
  const deposit         = depositPayments[0]
  const depositVerified = deposit?.status === "VERIFIED"
  const depositSubmitted = deposit?.status === "SUBMITTED"
  const depositFlagged  = deposit?.status === "FLAGGED"
  const showDepositForm = !deposit || depositFlagged

  // Deposit amount paid (use actual verified amount, not required)
  const depositPaid = depositVerified ? Number(deposit.amount) : 0

  // Overpaid deposit check
  const depositOverpaid = depositRequired !== null && depositPaid > depositRequired
  const depositOverpaidBy = depositOverpaid ? depositPaid - depositRequired : 0

  // Deposit overdue check
  const depositOverdue = !depositVerified && !depositSubmitted &&
    !!booking.depositDueDate && new Date(booking.depositDueDate) < new Date()

  // Full payment balance
  const fullBalancePaid     = payments?.filter((p) => p.paymentType === "FULL_BALANCE" && p.status === "VERIFIED")
    .reduce((s, p) => s + Number(p.amount), 0) ?? 0
  const fullBalancePending  = payments?.filter((p) => p.paymentType === "FULL_BALANCE" && p.status === "SUBMITTED")
    .at(0) ?? null
  const remainingBalance    = Math.max(0, agreedPrice - depositPaid - fullBalancePaid)
  const fullBalanceDue      = booking.fullPaymentDueDate
  const fullBalanceOverdue  = remainingBalance > 0 && !!fullBalanceDue &&
    new Date(fullBalanceDue) < new Date()

  const termsSet = !!(booking.paymentPlan && booking.depositAmount)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6 max-w-2xl"
    >
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
        <ArrowLeft size={15} aria-hidden="true" /> Back to booking
      </Button>

      <div>
        <h1 className="text-[22px] font-bold tracking-tighter text-text-main">Payments</h1>
        <p className="text-[13px] text-text-muted mt-0.5">
          {booking.package.name} — {fmt(agreedPrice)}
          {booking.isProvincial && (
            <span className="ml-2 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              Provincial rate
            </span>
          )}
        </p>
      </div>

      {/* Awaiting terms banner */}
      {!termsSet && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800">Awaiting contract terms</p>
            <p className="text-[12px] text-amber-700 mt-0.5">
              Our team will contact you at <strong>{booking.clientPhone}</strong> to discuss your
              deposit amount and payment plan before you can proceed.
            </p>
          </div>
        </div>
      )}

      {/* ── Deposit section ─────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-primary" aria-hidden="true" />
            <h2 className="text-[14px] font-semibold tracking-tight text-text-main">
              Reservation deposit
            </h2>
          </div>
          {deposit && <PaymentStatusBadge status={deposit.status} />}
        </div>

        <div className="p-5 space-y-4">
          {/* Terms summary */}
          {termsSet && depositRequired && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-background-blush px-3 py-2.5 text-[12px]">
              <div>
                <p className="text-text-muted">Required deposit</p>
                <p className="font-semibold text-text-main">{fmt(depositRequired)}</p>
              </div>
              {booking.depositDueDate && (
                <div>
                  <p className="text-text-muted">Due by</p>
                  <p className={cn(
                    "font-semibold",
                    depositOverdue ? "text-red-600" : "text-text-main",
                  )}>
                    {fmtDate(booking.depositDueDate)}
                    {depositOverdue && " ⚠"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Deposit overdue warning */}
          {depositOverdue && !depositSubmitted && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-[12px] font-semibold text-red-700">Deposit overdue</p>
                <p className="text-[12px] text-red-600">
                  Your deposit was due on {fmtDate(booking.depositDueDate!)}. Please submit your
                  payment as soon as possible or contact us to discuss your options.
                </p>
              </div>
            </div>
          )}

          {/* Overpaid notice */}
          {depositOverpaid && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <CheckCircle2 size={14} className="text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[12px] text-blue-700">
                You paid {fmt(depositPaid)} — {fmt(depositOverpaidBy)} more than the required deposit.
                This will be applied toward your remaining balance.
              </p>
            </div>
          )}

          {/* Payment details */}
          {deposit && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {[
                { label: "Amount paid",  value: fmt(Number(deposit.amount)) },
                { label: "Method",       value: PAYMENT_METHOD_LABELS[deposit.method] },
                ...(deposit.referenceNumber ? [{ label: "Reference", value: deposit.referenceNumber }] : []),
                ...(deposit.submittedAt   ? [{ label: "Submitted",  value: fmtDate(deposit.submittedAt) }] : []),
                ...(deposit.verifiedAt    ? [{ label: "Verified on", value: fmtDate(deposit.verifiedAt) }] : []),
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] text-text-muted">{label}</p>
                  <p className="text-[13px] font-medium text-text-main">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Status banners */}
          <AnimatePresence mode="wait">
            {depositSubmitted && (
              <motion.div key="submitted" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <Clock size={14} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-[12px] font-semibold text-amber-700">Under review</p>
                  <p className="text-[12px] text-amber-600">Your deposit is awaiting staff verification.</p>
                </div>
              </motion.div>
            )}
            {depositFlagged && (
              <motion.div key="flagged" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-[12px] font-semibold text-red-700">Deposit flagged</p>
                  <p className="text-[12px] text-red-600">
                    {deposit?.verificationNote || "Please resubmit a valid proof of payment."}
                  </p>
                </div>
              </motion.div>
            )}
            {depositVerified && (
              <motion.div key="verified" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[12px] text-emerald-700">
                  <span className="font-semibold">Deposit verified</span> — your booking is confirmed.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Deposit form */}
          {termsSet && showDepositForm && (
            <div className="border-t border-border pt-4">
              <PaymentProofUpload
                bookingId={bookingId}
                paymentType="DEPOSIT"
                defaultAmount={depositRequired ?? undefined}
                onSuccess={() => refetch()}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── FULL plan: remaining balance ──────────────────────── */}
      <AnimatePresence>
        {depositVerified && booking.paymentPlan === "FULL" && (
          <motion.div
            key="full-balance"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border border-border bg-white overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Wallet size={16} className="text-primary" aria-hidden="true" />
              <h2 className="text-[14px] font-semibold tracking-tight text-text-main">
                Remaining balance
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Balance summary */}
              <div className="grid grid-cols-3 gap-3 rounded-lg bg-background-blush px-3 py-2.5 text-[12px]">
                <div>
                  <p className="text-text-muted">Agreed price</p>
                  <p className="font-semibold text-text-main">{fmt(agreedPrice)}</p>
                </div>
                <div>
                  <p className="text-text-muted">Deposit paid</p>
                  <p className="font-semibold text-emerald-600">− {fmt(depositPaid)}</p>
                </div>
                <div>
                  <p className="text-text-muted">Balance due</p>
                  <p className={cn("font-semibold", remainingBalance > 0 ? "text-primary" : "text-emerald-600")}>
                    {fmt(remainingBalance)}
                  </p>
                </div>
              </div>

              {/* Due date + overdue warning */}
              {fullBalanceDue && remainingBalance > 0 && (
                <div className={cn(
                  "flex items-start gap-2 rounded-lg border p-3",
                  fullBalanceOverdue
                    ? "border-red-200 bg-red-50"
                    : "border-amber-200 bg-amber-50",
                )}>
                  {fullBalanceOverdue
                    ? <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                    : <Clock size={14} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />}
                  <p className={cn("text-[12px]", fullBalanceOverdue ? "text-red-700" : "text-amber-700")}>
                    {fullBalanceOverdue
                      ? <><span className="font-semibold">Balance overdue</span> — was due {fmtDate(fullBalanceDue)}. Please pay immediately.</>
                      : <>Balance due by <span className="font-semibold">{fmtDate(fullBalanceDue)}</span></>}
                  </p>
                </div>
              )}

              {/* Pending submission notice */}
              {fullBalancePending && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <Clock size={14} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-[12px] font-semibold text-amber-700">Payment under review</p>
                    <p className="text-[12px] text-amber-600">
                      Your full balance payment of {fmt(Number(fullBalancePending.amount))} is awaiting verification.
                    </p>
                  </div>
                </div>
              )}

              {/* Fully paid */}
              {remainingBalance === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" aria-hidden="true" />
                  <p className="text-[12px] font-semibold text-emerald-700">
                    Fully paid — no outstanding balance
                  </p>
                </div>
              )}

              {/* Payment form */}
              {remainingBalance > 0 && !fullBalancePending && (
                <>
                  {!showFullBalanceForm ? (
                    <Button className="w-full" onClick={() => setShowFullBalanceForm(true)}>
                      <Wallet size={15} aria-hidden="true" />
                      Pay remaining balance ({fmt(remainingBalance)})
                    </Button>
                  ) : (
                    <div className="border-t border-border pt-4">
                      <PaymentProofUpload
                        bookingId={bookingId}
                        paymentType="FULL_BALANCE"
                        defaultAmount={remainingBalance}
                        onSuccess={() => { setShowFullBalanceForm(false); refetch() }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INSTALLMENT plan: schedule ───────────────────────── */}
      <AnimatePresence>
        {depositVerified && booking.paymentPlan === "INSTALLMENT" && (
          <motion.div
            key="installments"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
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
                packagePrice={agreedPrice}
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
              onSuccess={() => { setPayingInstallment(null); refetch() }}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
