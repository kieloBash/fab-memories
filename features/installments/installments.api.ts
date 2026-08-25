// features/installments/installments.api.ts
"use client"

import api from "@/lib/axios"
import { installmentRoutes } from "./installments.constants"
import type { Installment } from "./installments.types"
import type { MarkInstallmentPaidInput } from "./installments.schema"

export async function fetchInstallments(paymentId: string): Promise<Installment[]> {
  const { data } = await api.get<Installment[]>(installmentRoutes.list(paymentId))
  return data
}

export async function markInstallmentPaid(
  paymentId: string,
  installmentId: string,
  input: MarkInstallmentPaidInput,
): Promise<Installment> {
  const { data } = await api.patch<Installment>(
    installmentRoutes.detail(paymentId, installmentId),
    input,
  )
  return data
}
