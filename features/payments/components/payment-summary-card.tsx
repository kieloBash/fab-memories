// features/payments/components/payment-summary-card.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, CreditCard, User } from "lucide-react"
import { PAYMENT_METHOD_LABELS } from "../payments.constants"
import { PaymentWithRelations } from "../payments.types"
import { PaymentStatusBadge } from "./payment-status-badge"


interface PaymentSummaryCardProps {
  payment: PaymentWithRelations
  onClick?: () => void
}

export function PaymentSummaryCard({ payment, onClick }: PaymentSummaryCardProps) {
  const formattedAmount = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(payment.amount))

  const submittedDate = payment.submittedAt
    ? new Date(payment.submittedAt).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    : null

  return (
    <Card
      onClick={onClick}
      className={onClick ? "cursor-pointer transition-shadow hover:shadow-md" : undefined}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-base font-semibold">{formattedAmount}</CardTitle>
        <PaymentStatusBadge status={payment.status} />
      </CardHeader>

      <CardContent className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 shrink-0" />
          <span>{PAYMENT_METHOD_LABELS[payment.method]}</span>
        </div>

        <div className="flex items-center gap-2">
          <User className="size-4 shrink-0" />
          <span>{payment.booking.client.fullName}</span>
        </div>

        {submittedDate && (
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" />
            <span>Submitted {submittedDate}</span>
          </div>
        )}

        {payment.referenceNumber && (
          <p className="text-xs">
            Ref: <span className="font-mono">{payment.referenceNumber}</span>
          </p>
        )}

        {payment.verificationNote && (
          <p className="rounded bg-muted px-2 py-1 text-xs">
            {payment.verificationNote}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
