// features/installments/installments.hooks.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/axios"
import { installmentKeys } from "./installments.constants"
import { createInstallmentSchedule, fetchInstallments } from "./installments.api"
import type { CreateInstallmentScheduleInput } from "./installments.schema"
import { InstallmentSummary } from "./installments.types"

export function useInstallments(bookingId: string) {
  return useQuery({
    queryKey: installmentKeys.byBooking(bookingId),
    queryFn: () => fetchInstallments(bookingId),
    enabled: !!bookingId,
    select: (installments): InstallmentSummary => {
      const totalAmount = installments.reduce(
        (sum, i) => sum + Number(i.amount), 0,
      )
      const totalPaid = installments
        .filter((i) => i.status === "PAID")
        .reduce((sum, i) => sum + Number(i.amount), 0)

      return {
        totalAmount,
        totalPaid,
        totalOutstanding: totalAmount - totalPaid,
        installments,
      }
    },
  })
}

export function useCreateInstallmentSchedule(bookingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateInstallmentScheduleInput) =>
      createInstallmentSchedule(bookingId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: installmentKeys.byBooking(bookingId) })
      toast.success(
        `Schedule saved — ${data.count} installment${data.count !== 1 ? "s" : ""} added`,
      )
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}
