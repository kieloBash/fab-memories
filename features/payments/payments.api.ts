// features/payments/payments.api.ts
"use client"

import api from "@/lib/axios"
import { paymentRoutes } from "./payments.constants"
import type { Payment, PaymentWithRelations } from "./payments.types"
import type {
  PaymentFilterInput,
  SubmitPaymentInput,
  VerifyPaymentInput,
} from "./payments.schema"

export async function fetchPayments(
  filters?: PaymentFilterInput,
): Promise<PaymentWithRelations[]> {
  const { data } = await api.get<PaymentWithRelations[]>(paymentRoutes.payments, {
    params: filters,
  })
  return data
}

export async function fetchPayment(id: string): Promise<PaymentWithRelations> {
  const { data } = await api.get<PaymentWithRelations>(paymentRoutes.payment(id))
  return data
}

export async function submitPayment(
  input: SubmitPaymentInput,
): Promise<PaymentWithRelations> {
  const { data } = await api.post<PaymentWithRelations>(paymentRoutes.payments, input)
  return data
}

export async function verifyPayment(
  id: string,
  input: VerifyPaymentInput,
): Promise<PaymentWithRelations> {
  const { data } = await api.patch<PaymentWithRelations>(
    paymentRoutes.verify(id),
    input,
  )
  return data
}
