// features/installments/components/installment-schedule-table.tsx
"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useInstallments } from "../installments.hooks"
import { MarkPaidDialog } from "./mark-paid-dialog"
import { INSTALLMENT_STATUS_LABELS } from "@/features/payments/payments.constants"

interface InstallmentScheduleTableProps {
  paymentId: string
  canMarkPaid?: boolean  // true for ADMIN / COORDINATOR
}

export function InstallmentScheduleTable({
  paymentId,
  canMarkPaid = false,
}: InstallmentScheduleTableProps) {
  const { data: installments, isLoading, isError } = useInstallments(paymentId)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading schedule…</p>
  if (isError) return <p className="text-sm text-destructive">Failed to load installments.</p>
  if (!installments?.length)
    return (
      <p className="text-sm text-muted-foreground">
        No installment schedule yet. It will be generated once the payment is verified.
      </p>
    )

  const totalAmount = installments.reduce((sum, i) => sum + Number(i.amount), 0)
  const paidAmount = installments
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + Number(i.amount), 0)

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {installments.filter((i) => i.status === "PAID").length} of{" "}
          {installments.length} installments paid
        </span>
        <span>
          {fmt(paidAmount)} / {fmt(totalAmount)}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Paid On</TableHead>
            {canMarkPaid && <TableHead className="text-right">Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {installments.map((installment) => {
            const dueDate = new Date(installment.dueDate).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
            const paidAt = installment.paidAt
              ? new Date(installment.paidAt).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—"

            const isOverdue =
              installment.status === "UNPAID" &&
              new Date(installment.dueDate) < new Date()

            return (
              <TableRow key={installment.id}>
                <TableCell className="font-mono text-sm">{installment.order}</TableCell>
                <TableCell className={isOverdue ? "text-destructive font-medium" : ""}>
                  {dueDate}
                  {isOverdue && (
                    <span className="ml-1 text-xs">(Overdue)</span>
                  )}
                </TableCell>
                <TableCell>{fmt(Number(installment.amount))}</TableCell>
                <TableCell>
                  <Badge
                    variant={installment.status === "PAID" ? "default" : "outline"}
                  >
                    {INSTALLMENT_STATUS_LABELS[installment.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{paidAt}</TableCell>
                {canMarkPaid && (
                  <TableCell className="text-right">
                    {installment.status === "UNPAID" && (
                      <MarkPaidDialog
                        paymentId={paymentId}
                        installmentId={installment.id}
                        order={installment.order}
                      />
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
