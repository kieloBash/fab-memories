// features/installments/index.ts

export { installmentKeys, installmentRoutes } from "./installments.constants"

export { markInstallmentPaidSchema } from "./installments.schema"
export type { MarkInstallmentPaidInput } from "./installments.schema"

export type { Installment } from "./installments.types"

export { fetchInstallments, markInstallmentPaid } from "./installments.api"

export { useInstallments, useMarkInstallmentPaid } from "./installments.hooks"

// Server-only — import directly in route handlers
// export { ... } from "./installments.query"
