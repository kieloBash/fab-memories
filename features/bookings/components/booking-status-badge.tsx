// features/bookings/components/booking-status-badge.tsx

import { Badge } from "@/components/ui/badge"
import type { BookingStatus } from "@/app/generated/prisma/client"
import { BOOKING_STATUS_LABELS } from "../bookings.constants"

const STATUS_VARIANT: Record<
  BookingStatus,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "muted"
> = {
  PENDING:   "warning",    // amber — awaiting action
  CONFIRMED: "success",    // green — all good
  CANCELLED: "destructive", // red — cancelled
}

interface BookingStatusBadgeProps {
  status: BookingStatus
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  )
}
