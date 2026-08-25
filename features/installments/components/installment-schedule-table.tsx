// features/installments/components/installment-schedule-table.tsx
"use client"

import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useInstallments } from "../installments.hooks"
import { INSTALLMENT_STATUS_LABELS } from "@/features/payments/payments.constants"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n)

interface InstallmentScheduleTableProps {
  bookingId: string
  /** When true shows a "Submit Payment" button per unpaid row (CLIENT view) */
  onPayInstallment?: (installmentId: string, amount: number) => void
}

export function InstallmentScheduleTable({
  bookingId,
  onPayInstallment,
}: InstallmentScheduleTableProps) {
  const { data, isLoading, isError } = useInstallments(bookingId)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading schedule…</p>
  if (isError)   return <p className="text-sm text-destructive">Failed to load installments.</p>
  if (!data?.installments.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No installment schedule set yet. The admin will create one after the contract is finalised.
      </p>
    )
  }

  const { totalAmount, totalPaid, totalOutstanding, installments } = data

  return (
    <div className="space-y-3">
      {/* Running balance summary */}
      <div className="grid grid-cols-3 gap-3 rounded-lg border p-3 text-sm">
        <div>
          <p className="text-muted-foreground">Total</p>
          <p className="font-semibold">{fmt(totalAmount)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Paid</p>
          <p className="font-semibold text-green-600">{fmt(totalPaid)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Outstanding</p>
          <p className="font-semibold text-destructive">{fmt(totalOutstanding)}</p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Paid On</TableHead>
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

            return (
              <TableRow key={inst.id}>
                <TableCell className="font-mono text-sm">{inst.order}</TableCell>
                <TableCell className={isOverdue ? "font-medium text-destructive" : ""}>
                  {dueDate}
                  {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
                </TableCell>
                <TableCell>{fmt(Number(inst.amount))}</TableCell>
                <TableCell>
                  <Badge variant={inst.status === "PAID" ? "default" : "outline"}>
                    {INSTALLMENT_STATUS_LABELS[inst.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{paidAt}</TableCell>
                {onPayInstallment && (
                  <TableCell className="text-right">
                    {inst.status === "UNPAID" && (
                      <button
                        onClick={() =>
                          onPayInstallment(inst.id, Number(inst.amount))
                        }
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Submit Payment
                      </button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
