// features/payments/payments.hooks.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/axios"
import { paymentKeys } from "./payments.constants"
import {
  fetchPayment,
  fetchPayments,
  submitPayment,
  verifyPayment,
} from "./payments.api"
import type { PaymentFilterInput, SubmitPaymentInput, VerifyPaymentInput } from "./payments.schema"

// ── Queries ───────────────────────────────────────────────────

export function usePayments(filters?: PaymentFilterInput) {
  return useQuery({
    queryKey: paymentKeys.list(filters ?? {}),
    queryFn: () => fetchPayments(filters),
  })
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: () => fetchPayment(id),
    enabled: !!id,
  })
}

export function useBookingPayments(bookingId: string) {
  return useQuery({
    queryKey: paymentKeys.byBooking(bookingId),
    queryFn: () => fetchPayments({ bookingId }),
    enabled: !!bookingId,
  })
}

// ── Mutations ─────────────────────────────────────────────────

export function useSubmitPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SubmitPaymentInput) => submitPayment(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: paymentKeys.byBooking(data.bookingId) })
      toast.success("Payment proof submitted successfully")
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}

export function useVerifyPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VerifyPaymentInput }) =>
      verifyPayment(id, input),
    onSuccess: (data, { input }) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: paymentKeys.byBooking(data.bookingId) })

      const message =
        input.action === "VERIFY"
          ? "Payment verified successfully"
          : "Payment flagged for resubmission"
      toast.success(message)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}
