// features/installments/installments.schema.ts

import { z } from "zod"

export const markInstallmentPaidSchema = z.object({
  note: z.string().max(300).optional(),
})

export type MarkInstallmentPaidInput = z.infer<typeof markInstallmentPaidSchema>
