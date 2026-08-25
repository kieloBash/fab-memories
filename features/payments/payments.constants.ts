// features/payments/payments.constants.ts

export const paymentKeys = {
  all: ["payments"] as const,
  lists: () => [...paymentKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...paymentKeys.lists(), filters] as const,
  details: () => [...paymentKeys.all, "detail"] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
  byBooking: (bookingId: string) => [...paymentKeys.all, "booking", bookingId] as const,
} as const

export const paymentRoutes = {
  payments: "/payments",
  payment: (id: string) => `/payments/${id}`,
  verify: (id: string) => `/payments/${id}/verify`,
  installments: (id: string) => `/payments/${id}/installments`,
  installment: (paymentId: string, installmentId: string) =>
    `/payments/${paymentId}/installments/${installmentId}`,
} as const

export const PAYMENT_STATUS_LABELS = {
  PENDING:   "Pending",
  SUBMITTED: "Submitted",
  VERIFIED:  "Verified",
  FLAGGED:   "Flagged",
} as const

export const PAYMENT_METHOD_LABELS = {
  GCASH:         "GCash",
  BANK_TRANSFER: "Bank Transfer",
  CASH:          "Cash",
  CREDIT_CARD:   "Credit Card",
} as const

export const INSTALLMENT_STATUS_LABELS = {
  UNPAID: "Unpaid",
  PAID:   "Paid",
} as const
