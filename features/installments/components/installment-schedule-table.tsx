// features/installments/components/installment-schedule-table.tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { CreditCard, AlertCircle } from "lucide-react"
import { useInstallments } from "../installments.hooks"
import { INSTALLMENT_STATUS_LABELS } from "@/features/payments/payments.constants"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n)

interface InstallmentScheduleTableProps {
  bookingId: string
  packagePrice: number
  depositPaid: number
  onPayInstallment?: (installmentId: string, amount: number) => void
}

export function InstallmentScheduleTable({
  bookingId,
  packagePrice,
  depositPaid,
  onPayInstallment,
}: InstallmentScheduleTableProps) {
  const { data, isLoading, isError } = useInstallments(bookingId)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-primary-soft/30 animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-600">
        <AlertCircle size={15} aria-hidden="true" />
        Failed to load installment schedule.
      </div>
    )
  }

  if (!data?.installments.length) {
    return (
      <div className="rounded-xl border border-border bg-background-blush p-5 text-center">
        <p className="text-[13px] text-text-muted">No installment schedule set yet.</p>
        <p className="text-[12px] text-text-muted mt-1">
          The admin will create one after your contract is finalised.
        </p>
      </div>
    )
  }

  const { totalPaid: installmentsPaid, installments } = data

  const totalPaidOverall = depositPaid + installmentsPaid
  const overallOutstanding = packagePrice - totalPaidOverall
  const paidPercent = packagePrice > 0
    ? Math.min(100, Math.round((totalPaidOverall / packagePrice) * 100))
    : 0

  const depositPercent = packagePrice > 0
    ? Math.round((depositPaid / packagePrice) * 100)
    : 0
  const installmentsPercent = packagePrice > 0
    ? Math.round((installmentsPaid / packagePrice) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Balance summary */}
      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-0.5">
              Package
            </p>
            <p className="font-semibold text-text-main">{fmt(packagePrice)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-0.5">
              Deposit
            </p>
            <p className="font-semibold text-emerald-600">{fmt(depositPaid)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-0.5">
              Installments paid
            </p>
            <p className="font-semibold text-emerald-600">{fmt(installmentsPaid)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-0.5">
              Remaining
            </p>
            <p className="font-semibold text-primary">{fmt(overallOutstanding)}</p>
          </div>
        </div>

        {/* Stacked progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-text-muted">Payment progress</span>
            <span className="text-[11px] font-semibold text-text-main">{paidPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-primary-soft overflow-hidden">
            <div className="h-full flex rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-500 shrink-0"
                style={{ width: `${depositPercent}%` }}
              />
              <div
                className="h-full transition-all duration-500 shrink-0"
                style={{
                  width: `${installmentsPercent}%`,
                  background: "linear-gradient(90deg, var(--primary), var(--primary-deep))",
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Deposit
            </span>
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
              Installments
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Paid on</TableHead>
              {onPayInstallment && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {installments.map((inst) => {
              const dueDate = new Date(inst.dueDate).toLocaleDateString("en-PH", {
                year: "numeric", month: "short", day: "numeric",
              })
              const paidAt = inst.paidAt
                ? new Date(inst.paidAt).toLocaleDateString("en-PH", {
                  year: "numeric", month: "short", day: "numeric",
                })
                : "—"
              const isOverdue =
                inst.status === "UNPAID" && new Date(inst.dueDate) < new Date()

              // FIX: payments is now an array — check the latest one's status
              const latestPayment = inst.payments?.[0]
              const hasPendingPayment =
                latestPayment &&
                ["SUBMITTED", "PENDING"].includes(latestPayment.status)

              return (
                <TableRow key={inst.id}>
                  <TableCell className="font-mono text-[12px] text-text-muted">
                    {inst.order}
                  </TableCell>
                  <TableCell>
                    <span className={isOverdue ? "font-medium text-red-600" : "text-text-main"}>
                      {dueDate}
                    </span>
                    {isOverdue && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-red-500 bg-red-50 px-1.5 py-0.5 rounded-pill">
                        Overdue
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-text-main">
                    {fmt(Number(inst.amount))}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        inst.status === "PAID"
                          ? "success"
                          : isOverdue
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {INSTALLMENT_STATUS_LABELS[inst.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-text-muted">{paidAt}</TableCell>
                  {onPayInstallment && (
                    <TableCell className="text-right">
                      {inst.status === "UNPAID" && !hasPendingPayment && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onPayInstallment(inst.id, Number(inst.amount))}
                        >
                          <CreditCard size={13} aria-hidden="true" />
                          Pay now
                        </Button>
                      )}
                      {hasPendingPayment && (
                        <Badge variant="warning">Under review</Badge>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
