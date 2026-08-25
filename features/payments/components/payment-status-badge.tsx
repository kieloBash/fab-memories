// features/payments/components/payment-status-badge.tsx

import { Badge } from "@/components/ui/badge"
import type { PaymentStatus } from "@/app/generated/prisma/client"
import { PAYMENT_STATUS_LABELS } from "../payments.constants"

const STATUS_VARIANT: Record<
  PaymentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING:   "outline",
  SUBMITTED: "secondary",
  VERIFIED:  "default",
  FLAGGED:   "destructive",
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  )
}
