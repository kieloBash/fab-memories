// features/payments/payments.schema.ts

import { z } from "zod"

const PAYMENT_METHODS  = ["GCASH", "MAYA", "BANK_TRANSFER", "CHEQUE", "CASH"] as const
const PAYMENT_TYPES    = ["DEPOSIT", "INSTALLMENT"] as const
const PAYMENT_STATUSES = ["PENDING", "SUBMITTED", "VERIFIED", "FLAGGED"] as const

export const submitPaymentSchema = z
  .object({
    bookingId: z.string().min(1, "Booking ID is required"),
    installmentId: z.string().optional(), // required when paymentType === INSTALLMENT
    paymentType: z.enum(PAYMENT_TYPES, {
      error: `Payment type must be one of: ${PAYMENT_TYPES.join(", ")}`,
    }),
    method: z.enum(PAYMENT_METHODS, {
      error: `Method must be one of: ${PAYMENT_METHODS.join(", ")}`,
    }),
    amount: z
      .number({ error: "Amount must be a number" })
      .positive("Amount must be greater than 0")
      .multipleOf(0.01, "Amount cannot have more than 2 decimal places"),
    proofStoragePath: z.string().optional(), // set after client-side upload
    referenceNumber:  z.string().max(100).optional(),
  })
  // CHEQUE is only allowed for deposits
  .refine(
    (d) => !(d.method === "CHEQUE" && d.paymentType !== "DEPOSIT"),
    {
      message: "Cheque payments are only accepted for the reservation deposit",
      path: ["method"],
    },
  )
  // Must provide either a proof image path or a reference number
  .refine(
    (d) => !!d.proofStoragePath || !!d.referenceNumber,
    {
      message: "Either a proof screenshot or a reference number is required",
      path: ["proofStoragePath"],
    },
  )
  // Installment payments must specify which installment they cover
  .refine(
    (d) => d.paymentType !== "INSTALLMENT" || !!d.installmentId,
    {
      message: "installmentId is required for installment payments",
      path: ["installmentId"],
    },
  )

export const verifyPaymentSchema = z.object({
  action: z.enum(["VERIFY", "FLAG"], {
    error: "Action must be VERIFY or FLAG",
  }),
  verificationNote: z.string().max(500).optional(),
})

export const paymentFilterSchema = z.object({
  status:      z.enum(PAYMENT_STATUSES).optional(),
  paymentType: z.enum(PAYMENT_TYPES).optional(),
  bookingId:   z.string().optional(),
})

export type SubmitPaymentInput   = z.infer<typeof submitPaymentSchema>
export type VerifyPaymentInput   = z.infer<typeof verifyPaymentSchema>
export type PaymentFilterInput   = z.infer<typeof paymentFilterSchema>
