// features/installments/installments.hooks.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/axios"
import { installmentKeys } from "./installments.constants"
import { fetchInstallments, markInstallmentPaid } from "./installments.api"
import type { MarkInstallmentPaidInput } from "./installments.schema"

export function useInstallments(paymentId: string) {
  return useQuery({
    queryKey: installmentKeys.byPayment(paymentId),
    queryFn: () => fetchInstallments(paymentId),
    enabled: !!paymentId,
  })
}

export function useMarkInstallmentPaid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      paymentId,
      installmentId,
      input,
    }: {
      paymentId: string
      installmentId: string
      input: MarkInstallmentPaidInput
    }) => markInstallmentPaid(paymentId, installmentId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: installmentKeys.byPayment(data.paymentId),
      })
      toast.success("Installment marked as paid")
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}
