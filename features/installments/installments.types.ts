// features/installments/installments.types.ts

import type { InstallmentStatus } from "@/app/generated/prisma/client"

export interface InstallmentPayment {
  id: string
  amount: string
  method: string
  referenceNumber: string | null
  proofImageUrl: string | null
  verifiedAt: string | null
}

export interface Installment {
  id: string
  bookingId: string
  order: number
  dueDate: string
  amount: string            // Decimal as string
  status: InstallmentStatus
  note: string | null
  paymentId: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
  payment?: InstallmentPayment | null
}

/** Summary for the running balance display */
export interface InstallmentSummary {
  totalAmount: number
  totalPaid: number
  totalOutstanding: number
  installments: Installment[]
}
