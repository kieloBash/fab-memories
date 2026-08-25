// features/payments/components/payment-status-badge.tsx

import { Badge } from "@/components/ui/badge"
import type { PaymentStatus } from "@/app/generated/prisma/client"
import { PAYMENT_STATUS_LABELS } from "../payments.constants"

const STATUS_VARIANT: Record<
  PaymentStatus,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "muted"
> = {
  PENDING:   "muted",      // gray — not yet submitted
  SUBMITTED: "warning",    // amber — awaiting verification
  VERIFIED:  "success",    // green — confirmed
  FLAGGED:   "destructive", // red — needs attention
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  )
}
