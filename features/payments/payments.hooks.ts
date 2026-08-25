// features/payments/payments.hooks.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/axios"
import { uploadPaymentProof, validatePaymentProofFile } from "@/lib/storage"
import { paymentKeys } from "./payments.constants"
import {
  fetchPayment,
  fetchPayments,
  submitPayment,
  verifyPayment,
} from "./payments.api"
import type {
  PaymentFilterInput,
  SubmitPaymentInput,
  VerifyPaymentInput,
} from "./payments.schema"

// ── Queries ───────────────────────────────────────────────────

export function usePayments(filters?: PaymentFilterInput) {
  return useQuery({
    queryKey: paymentKeys.list(filters ?? {}),
    queryFn:  () => fetchPayments(filters),
  })
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn:  () => fetchPayment(id),
    enabled:  !!id,
  })
}

export function useBookingPayments(bookingId: string) {
  return useQuery({
    queryKey: paymentKeys.byBooking(bookingId),
    queryFn:  () => fetchPayments({ bookingId }),
    enabled:  !!bookingId,
  })
}

// ── Mutations ─────────────────────────────────────────────────

/**
 * Handles the full payment submission flow:
 *   1. If a file is provided, validates and uploads it to Supabase Storage
 *   2. Posts the resulting storage path (or reference number) to /api/payments
 */
export function useSubmitPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      input,
      file,
    }: {
      input: Omit<SubmitPaymentInput, "proofStoragePath">
      file?: File
    }) => {
      let proofStoragePath: string | undefined

      if (file) {
        const validation = validatePaymentProofFile(file)
        if (!validation.valid) throw new Error(validation.error)

        proofStoragePath = await uploadPaymentProof(
          file,
          input.bookingId,
          input.paymentType === "DEPOSIT" ? "deposit" : "installment",
        )
      }

      return submitPayment({ ...input, proofStoragePath })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: paymentKeys.byBooking(data.bookingId) })
      const label =
        data.paymentType === "DEPOSIT"
          ? "Deposit proof submitted"
          : "Installment payment proof submitted"
      toast.success(`${label} successfully`)
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
          ? data.paymentType === "DEPOSIT"
            ? "Deposit verified — booking is now confirmed"
            : "Installment payment verified"
          : "Payment flagged for resubmission"
      toast.success(message)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}
