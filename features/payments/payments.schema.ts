// features/payments/payments.schema.ts

import { z } from "zod"

const PAYMENT_METHODS = ["GCASH", "BANK_TRANSFER", "CASH", "CREDIT_CARD"] as const
const PAYMENT_STATUSES = ["PENDING", "SUBMITTED", "VERIFIED", "FLAGGED"] as const

export const submitPaymentSchema = z
  .object({
    bookingId: z.string().min(1, "Booking ID is required"),
    method: z.enum(PAYMENT_METHODS, {
      error: `Method must be one of: ${PAYMENT_METHODS.join(", ")}`,
    }),
    amount: z
      .number({ error: "Amount must be a number" })
      .positive("Amount must be greater than 0")
      .multipleOf(0.01, "Amount cannot have more than 2 decimal places"),
    // Client provides either a proof image URL (after upload) or a reference number
    proofImageUrl: z.string().url("Must be a valid URL").optional(),
    referenceNumber: z.string().max(100).optional(),
  })
  .refine(
    (data) => !!data.proofImageUrl || !!data.referenceNumber,
    {
      message: "Either a proof image or a reference number is required",
      path: ["proofImageUrl"],
    },
  )

export const verifyPaymentSchema = z.object({
  action: z.enum(["VERIFY", "FLAG"], {
    error: "Action must be VERIFY or FLAG",
  }),
  verificationNote: z.string().max(500).optional(),
})

export const paymentFilterSchema = z.object({
  status: z.enum(PAYMENT_STATUSES).optional(),
  bookingId: z.string().optional(),
})

export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>
export type PaymentFilterInput = z.infer<typeof paymentFilterSchema>
