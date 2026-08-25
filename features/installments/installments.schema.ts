// features/installments/installments.schema.ts

import { z } from "zod"

const installmentItemSchema = z.object({
  order: z.number().int().min(1),
  dueDate: z
    .string()
    .min(1, "Due date is required")
    .refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date format" }),
  amount: z
    .number({ error: "Amount must be a number" })
    .positive("Amount must be greater than 0")
    .multipleOf(0.01),
  note: z.string().max(300).optional(),
})

export const createInstallmentScheduleSchema = z.object({
  installments: z
    .array(installmentItemSchema)
    .min(1, "At least one installment is required")
    .max(24, "Maximum of 24 installments"),
})

export type CreateInstallmentScheduleInput = z.infer<
  typeof createInstallmentScheduleSchema
>
export type InstallmentItem = z.infer<typeof installmentItemSchema>
