// features/bookings/components/payment-summary.tsx
"use client"

import { useBookingPayments, PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS } from "@/features/payments"
import { useInstallments } from "@/features/installments/installments.hooks"
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2, Clock, AlertCircle, AlertTriangle,
  CreditCard, Banknote, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { BookingWithRelations } from "../bookings.types"
import type { PaymentWithRelations } from "@/features/payments"

// ── Helpers ───────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP", minimumFractionDigits: 0,
  }).format(n)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  })

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

// ── Sub-components ────────────────────────────────────────────

function SegmentBar({
  depositPct,
  pendingPct,
}: {
  depositPct: number
  pendingPct: number
}) {
  const paidPct    = Math.min(100, depositPct)
  const submPct    = Math.min(100 - paidPct, pendingPct)
  const remaining  = 100 - paidPct - submPct

  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-border/50">
      {/* Paid segment — emerald */}
      <div
        className="absolute left-0 top-0 h-full rounded-l-full bg-emerald-400 transition-all duration-700"
        style={{ width: `${paidPct}%` }}
        aria-hidden="true"
      />
      {/* Pending/submitted segment — amber */}
      <div
        className="absolute top-0 h-full bg-amber-400/80 transition-all duration-700"
        style={{ left: `${paidPct}%`, width: `${submPct}%` }}
        aria-hidden="true"
      />
      {/* Remaining segment — subtle primary */}
      {remaining > 0 && (
        <div
          className="absolute right-0 top-0 h-full rounded-r-full"
          style={{
            width: `${remaining}%`,
            background: "var(--primary-soft, #fce4ef)",
          }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

function TransactionRow({
  payment,
  onViewDetail,
}: {
  payment: PaymentWithRelations
  onViewDetail?: (id: string) => void
}) {
  const isVerified  = payment.status === "VERIFIED"
  const isSubmitted = payment.status === "SUBMITTED"
  const isFlagged   = payment.status === "FLAGGED"

  const iconBg = isVerified
    ? "bg-emerald-50"
    : isSubmitted
      ? "bg-amber-50"
      : isFlagged
        ? "bg-red-50"
        : "bg-background-blush"

  const IconComp = isVerified
    ? CheckCircle2
    : isSubmitted
      ? Clock
      : isFlagged
        ? AlertCircle
        : CreditCard

  const iconColor = isVerified
    ? "text-emerald-500"
    : isSubmitted
      ? "text-amber-500"
      : isFlagged
        ? "text-red-500"
        : "text-text-muted"

  return (
    <div
      role={onViewDetail ? "button" : undefined}
      tabIndex={onViewDetail ? 0 : undefined}
      onClick={() => onViewDetail?.(payment.id)}
      onKeyDown={(e) => { if (e.key === "Enter") onViewDetail?.(payment.id) }}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 transition-colors",
        onViewDetail
          ? "cursor-pointer hover:bg-primary-soft/30 border border-border hover:border-border-strong bg-background-blush"
          : "border border-border bg-background-blush",
      )}
    >
      {/* Icon */}
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconBg)}>
        <IconComp size={14} className={iconColor} aria-hidden="true" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[12px] font-semibold text-text-main">
            {PAYMENT_TYPE_LABELS[payment.paymentType]}
          </p>
          {payment.paymentType === "DEPOSIT" && (
            <Badge variant="secondary" className="text-[10px]">Deposit</Badge>
          )}
        </div>
        <p className="text-[11px] text-text-muted mt-0.5">
          {PAYMENT_METHOD_LABELS[payment.method]}
          {payment.referenceNumber && ` · ${payment.referenceNumber}`}
          {" · "}
          {payment.submittedAt ? fmtDate(payment.submittedAt) : fmtDate(payment.createdAt)}
        </p>
        {payment.verificationNote && (
          <p className={cn(
            "text-[11px] mt-0.5 italic",
            isFlagged ? "text-red-600" : "text-text-muted",
          )}>
            "{payment.verificationNote}"
          </p>
        )}
      </div>

      {/* Amount + status */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <p className={cn(
          "text-[13px] font-semibold",
          isVerified  ? "text-emerald-600"
          : isFlagged ? "text-red-500"
          : "text-text-main",
        )}>
          {isVerified ? "+" : ""}{fmt(Number(payment.amount))}
        </p>
        <PaymentStatusBadge status={payment.status} />
      </div>

      {onViewDetail && (
        <ChevronRight size={13} className="text-text-muted shrink-0" aria-hidden="true" />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

interface PaymentSummaryProps {
  booking: BookingWithRelations
  /** If provided, each transaction row becomes clickable and calls this */
  onViewPayment?: (paymentId: string) => void
  /** Show more detail (staff view vs client view) */
  variant?: "client" | "staff"
}

export function PaymentSummary({
  booking,
  onViewPayment,
  variant = "client",
}: PaymentSummaryProps) {
  const { data: payments, isLoading: paymentsLoading } = useBookingPayments(booking.id)
  const { data: installmentSummary }                   = useInstallments(booking.id)

  const agreedPrice  = Number(booking.agreedPrice)
  const depositRequired = booking.depositAmount ? Number(booking.depositAmount) : null

  // ── Compute totals from verified payments ────────────────────
  const verifiedDeposit = payments
    ?.filter((p) => p.paymentType === "DEPOSIT" && p.status === "VERIFIED")
    .reduce((s, p) => s + Number(p.amount), 0) ?? 0

  const verifiedInstallments = payments
    ?.filter((p) => p.paymentType === "INSTALLMENT" && p.status === "VERIFIED")
    .reduce((s, p) => s + Number(p.amount), 0) ?? 0

  const verifiedFullBalance = payments
    ?.filter((p) => p.paymentType === "FULL_BALANCE" && p.status === "VERIFIED")
    .reduce((s, p) => s + Number(p.amount), 0) ?? 0

  const totalVerified   = verifiedDeposit + verifiedInstallments + verifiedFullBalance
  const totalPending    = payments
    ?.filter((p) => p.status === "SUBMITTED")
    .reduce((s, p) => s + Number(p.amount), 0) ?? 0
  const totalOutstanding = Math.max(0, agreedPrice - totalVerified)
  const isFullyPaid      = totalVerified >= agreedPrice

  // Progress bar percentages
  const verifiedPct = agreedPrice > 0 ? Math.min(100, Math.round((totalVerified / agreedPrice) * 100)) : 0
  const pendingPct  = agreedPrice > 0 ? Math.min(100 - verifiedPct, Math.round((totalPending / agreedPrice) * 100)) : 0

  // Due dates
  const depositOverdue = !!(
    !verifiedDeposit &&
    booking.depositDueDate &&
    new Date(booking.depositDueDate) < new Date()
  )
  const balanceOverdue = !!(
    totalOutstanding > 0 &&
    booking.paymentPlan === "FULL" &&
    booking.fullPaymentDueDate &&
    new Date(booking.fullPaymentDueDate) < new Date()
  )

  if (paymentsLoading) {
    return (
      <div className="space-y-3">
        <div className="h-24 rounded-xl bg-border/30 animate-pulse" />
        <div className="h-16 rounded-xl bg-border/30 animate-pulse" />
        <div className="h-16 rounded-xl bg-border/30 animate-pulse" />
      </div>
    )
  }

  const noTerms = !booking.paymentPlan && !booking.depositAmount

  return (
    <div className="space-y-4">

      {/* ── Progress card ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
            Payment summary
          </p>
          {isFullyPaid && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
              <CheckCircle2 size={13} aria-hidden="true" />
              Fully paid
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          {noTerms ? (
            <div className="flex items-center gap-2 text-[12px] text-text-muted">
              <Clock size={13} aria-hidden="true" />
              Payment terms not yet set. Awaiting staff discussion.
            </div>
          ) : (
            <>
              {/* 4-column figures */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-background-blush p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
                    Total
                  </p>
                  <p className="text-[15px] font-bold tracking-tight text-text-main">
                    {fmt(agreedPrice)}
                  </p>
                  {booking.isProvincial && (
                    <p className="text-[10px] text-amber-600 mt-0.5">Provincial rate</p>
                  )}
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 mb-1">
                    Paid
                  </p>
                  <p className="text-[15px] font-bold tracking-tight text-emerald-700">
                    {fmt(totalVerified)}
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">{verifiedPct}% of total</p>
                </div>
                {totalPending > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 mb-1">
                      Pending
                    </p>
                    <p className="text-[15px] font-bold tracking-tight text-amber-700">
                      {fmt(totalPending)}
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5">Awaiting verification</p>
                  </div>
                )}
                <div className={cn(
                  "rounded-lg p-3 border",
                  isFullyPaid
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-red-50 border-red-100",
                )}>
                  <p className={cn(
                    "text-[10px] font-semibold uppercase tracking-widest mb-1",
                    isFullyPaid ? "text-emerald-600" : "text-red-500",
                  )}>
                    {isFullyPaid ? "Balance" : "Remaining"}
                  </p>
                  <p className={cn(
                    "text-[15px] font-bold tracking-tight",
                    isFullyPaid ? "text-emerald-700" : "text-red-600",
                  )}>
                    {fmt(totalOutstanding)}
                  </p>
                  {!isFullyPaid && booking.paymentPlan && (
                    <p className="text-[10px] text-red-500 mt-0.5">
                      {booking.paymentPlan === "FULL" ? "Full payment" : "Installments"}
                    </p>
                  )}
                </div>
              </div>

              {/* Stacked progress bar */}
              <div className="space-y-2">
                <SegmentBar depositPct={verifiedPct} pendingPct={pendingPct} />
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                    Verified
                  </span>
                  {totalPending > 0 && (
                    <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
                      <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                      Pending verification
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: "var(--primary-soft, #fce4ef)" }}
                    />
                    Remaining
                  </span>
                </div>
              </div>

              {/* Deposit requirement row */}
              {depositRequired && (
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-[12px]">
                  <span className="text-text-muted">Deposit required</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-main">{fmt(depositRequired)}</span>
                    {booking.depositDueDate && (
                      <span className={cn(
                        "text-[11px] rounded-full px-2 py-0.5 font-medium",
                        depositOverdue
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : "bg-background-blush text-text-muted",
                      )}>
                        {depositOverdue ? "⚠ " : ""}Due {fmtDate(booking.depositDueDate)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Full balance due row */}
              {booking.paymentPlan === "FULL" && booking.fullPaymentDueDate && totalOutstanding > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-[12px]">
                  <span className="text-text-muted">Full balance due</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-main">{fmt(totalOutstanding)}</span>
                    <span className={cn(
                      "text-[11px] rounded-full px-2 py-0.5 font-medium",
                      balanceOverdue
                        ? "bg-red-50 text-red-600 border border-red-200"
                        : "bg-background-blush text-text-muted",
                    )}>
                      {balanceOverdue ? "⚠ " : ""}By {fmtDate(booking.fullPaymentDueDate)}
                    </span>
                  </div>
                </div>
              )}

              {/* Overdue alerts */}
              {(depositOverdue || balanceOverdue) && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-0.5">
                    {depositOverdue && (
                      <p className="text-[12px] text-red-700">
                        <span className="font-semibold">Deposit overdue</span> — was due{" "}
                        {fmtDate(booking.depositDueDate!)}. Please submit payment immediately.
                      </p>
                    )}
                    {balanceOverdue && (
                      <p className="text-[12px] text-red-700">
                        <span className="font-semibold">Balance overdue</span> — was due{" "}
                        {fmtDate(booking.fullPaymentDueDate!)}. Please settle immediately.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Staff-only: installment breakdown */}
              {variant === "staff" && installmentSummary && installmentSummary.installments.length > 0 && (
                <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                  <div className="px-3 py-2 bg-background-blush flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                      Installments
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {installmentSummary.installments.filter((i) => i.status === "PAID").length} of{" "}
                      {installmentSummary.installments.length} paid
                    </p>
                  </div>
                  {installmentSummary.installments.map((inst) => {
                    const isOverdue = inst.status === "UNPAID" && new Date(inst.dueDate) < new Date()
                    return (
                      <div key={inst.id} className="flex items-center justify-between px-3 py-2.5 text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-text-muted w-4">#{inst.order}</span>
                          <span className={cn(isOverdue && "text-red-600 font-medium")}>
                            {fmtDate(inst.dueDate)}
                            {isOverdue && " ⚠"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text-main">{fmt(Number(inst.amount))}</span>
                          <Badge variant={inst.status === "PAID" ? "success" : isOverdue ? "destructive" : "outline"}>
                            {inst.status}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Transaction history ──────────────────────────────── */}
      {payments && payments.length > 0 && (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Transaction history
            </p>
          </div>
          <div className="p-4 space-y-2">
            {payments.map((payment) => (
              <TransactionRow
                key={payment.id}
                payment={payment as PaymentWithRelations}
                onViewDetail={onViewPayment}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!payments || payments.length === 0) && (
        <div className="rounded-xl border border-border bg-white p-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-blush mx-auto mb-2">
            <Banknote size={18} className="text-text-muted" aria-hidden="true" />
          </div>
          <p className="text-[13px] font-medium text-text-main">No transactions yet</p>
          <p className="text-[12px] text-text-muted mt-0.5">
            Payments will appear here once submitted.
          </p>
        </div>
      )}
    </div>
  )
}
