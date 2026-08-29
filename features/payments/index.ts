// features/payments/index.ts

export {
  paymentKeys,
  paymentRoutes,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  INSTALLMENT_STATUS_LABELS,
} from "./payments.constants"

export {
  submitPaymentSchema,
  verifyPaymentSchema,
  paymentFilterSchema,
} from "./payments.schema"
export type {
  SubmitPaymentInput,
  VerifyPaymentInput,
  PaymentFilterInput,
} from "./payments.schema"

export type {
  Payment,
  PaymentWithRelations,
  PaymentVerifier,
  PaymentBooking,
} from "./payments.types"

export {
  fetchPayments,
  fetchPayment,
  submitPayment,
  verifyPayment,
} from "./payments.api"

export {
  usePayments,
  usePayment,
  useBookingPayments,
  useSubmitPayment,
  useVerifyPayment,
  useRecordManualPayment,
} from "./payments.hooks"

// Server-only — import directly in route handlers
// export { ... } from "./payments.query"
