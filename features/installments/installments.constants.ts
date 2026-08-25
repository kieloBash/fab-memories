// features/installments/installments.constants.ts

export const installmentKeys = {
  all: ["installments"] as const,
  byBooking: (bookingId: string) =>
    [...installmentKeys.all, "booking", bookingId] as const,
  detail: (id: string) => [...installmentKeys.all, id] as const,
} as const

export const installmentRoutes = {
  list:   (bookingId: string) => `/bookings/${bookingId}/installments`,
  detail: (bookingId: string, installmentId: string) =>
    `/bookings/${bookingId}/installments/${installmentId}`,
} as const

// Re-export paymentKeys for use in hooks (avoids circular imports)
export { paymentKeys } from "@/features/payments/payments.constants"
