// features/installments/index.ts

export { installmentKeys, installmentRoutes } from "./installments.constants"

export { createInstallmentScheduleSchema } from "./installments.schema"
export type {
  CreateInstallmentScheduleInput,
  InstallmentItem,
} from "./installments.schema"

export type {
  Installment,
  InstallmentPayment,
  InstallmentSummary,
} from "./installments.types"

export { fetchInstallments, createInstallmentSchedule } from "./installments.api"

export {
  useInstallments,
  useCreateInstallmentSchedule,
} from "./installments.hooks"

// Server-only — import directly in route handlers
// export { ... } from "./installments.query"
