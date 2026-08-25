// features/installments/installments.constants.ts

export const installmentKeys = {
  all: ["installments"] as const,
  byPayment: (paymentId: string) =>
    [...installmentKeys.all, "payment", paymentId] as const,
  detail: (paymentId: string, installmentId: string) =>
    [...installmentKeys.all, paymentId, installmentId] as const,
} as const

export const installmentRoutes = {
  list: (paymentId: string) => `/payments/${paymentId}/installments`,
  detail: (paymentId: string, installmentId: string) =>
    `/payments/${paymentId}/installments/${installmentId}`,
} as const
