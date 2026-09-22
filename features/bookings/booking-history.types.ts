// features/bookings/booking-history.types.ts

export type BookingHistoryKind =
  | "requested" | "edited" | "terms_updated"
  | "cancellation_requested" | "cancellation_declined"
  | "confirmed" | "cancelled" | "withdrawn"
  | "deposit_submitted" | "deposit_verified"
  | "balance_submitted" | "balance_verified"
  | "installment_submitted" | "installment_verified"
  | "payment_flagged" | "other"

export interface BookingHistoryEvent {
  id: string
  at: string
  /** Who did it — null for a system/webhook-originated entry. No name is ever included (see lib/audit/redact.ts). */
  actorRole: "ADMIN" | "COORDINATOR" | "CLIENT" | "VENDOR" | null
  kind: BookingHistoryKind
  label: string
}
