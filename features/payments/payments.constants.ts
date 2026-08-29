// features/payments/payments.constants.ts

export const paymentKeys = {
  all:      ["payments"] as const,
  lists:    () => [...paymentKeys.all, "list"] as const,
  list:     (filters: Record<string, unknown>) => [...paymentKeys.lists(), filters] as const,
  details:  () => [...paymentKeys.all, "detail"] as const,
  detail:   (id: string) => [...paymentKeys.details(), id] as const,
  byBooking: (bookingId: string) => [...paymentKeys.all, "booking", bookingId] as const,
} as const

export const paymentRoutes = {
  payments: "/payments",
  payment:  (id: string) => `/payments/${id}`,
  verify:   (id: string) => `/payments/${id}/verify`,
  manual:   "/payments/manual",
} as const

export const PAYMENT_STATUS_LABELS = {
  PENDING:   "Pending",
  SUBMITTED: "Submitted",
  VERIFIED:  "Verified",
  FLAGGED:   "Flagged",
} as const

export const PAYMENT_METHOD_LABELS = {
  GCASH:         "GCash",
  MAYA:          "Maya",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE:        "Cheque",
  CASH:          "Cash",
} as const

export const PAYMENT_TYPE_LABELS = {
  DEPOSIT:      "Reservation Deposit",
  INSTALLMENT:  "Installment Payment",
  FULL_BALANCE: "Full Balance Payment",
} as const

export const INSTALLMENT_STATUS_LABELS = {
  UNPAID: "Unpaid",
  PAID:   "Paid",
} as const
