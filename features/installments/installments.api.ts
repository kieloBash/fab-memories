// features/installments/installments.api.ts
"use client"

import api from "@/lib/axios"
import { installmentRoutes } from "./installments.constants"
import type { Installment } from "./installments.types"
import type { CreateInstallmentScheduleInput } from "./installments.schema"

export async function fetchInstallments(bookingId: string): Promise<Installment[]> {
  const { data } = await api.get<Installment[]>(installmentRoutes.list(bookingId))
  return data
}

export async function createInstallmentSchedule(
  bookingId: string,
  input: CreateInstallmentScheduleInput,
): Promise<{ count: number }> {
  const { data } = await api.post<{ count: number }>(
    installmentRoutes.list(bookingId),
    input,
  )
  return data
}
