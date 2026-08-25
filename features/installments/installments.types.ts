// features/installments/installments.types.ts

import type { InstallmentStatus } from "@/app/generated/prisma/client"

/**
 * The most recent Payment linked to an installment.
 * Used to show "Under review" badge when a payment is SUBMITTED.
 */
export interface InstallmentPayment {
  id: string
  amount: string
  method: string
  referenceNumber: string | null
  proofStoragePath: string | null
  status: string         // PaymentStatus — kept as string to avoid circular import
  verifiedAt: string | null
}

export interface Installment {
  id: string
  bookingId: string
  order: number
  dueDate: string
  amount: string
  status: InstallmentStatus
  note: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
  // Latest payment for this installment (if any)
  payments: InstallmentPayment[]
}

/** Computed summary used by the balance display */
export interface InstallmentSummary {
  totalAmount: number
  totalPaid: number
  totalOutstanding: number
  installments: Installment[]
}
