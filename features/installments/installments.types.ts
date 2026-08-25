// features/installments/installments.types.ts

import type { InstallmentStatus } from "@/app/generated/prisma/client"

export interface Installment {
  id: string
  paymentId: string
  dueDate: string       // ISO date string
  amount: string        // Decimal serialized as string
  status: InstallmentStatus
  paidAt: string | null
  note: string | null
  order: number
  createdAt: string
  updatedAt: string
}
