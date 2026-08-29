// features/payments/payments.hooks.ts
"use client"

import { getApiErrorMessage } from "@/lib/axios"
import { uploadPaymentProof, validatePaymentProofFile } from "@/lib/storage"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  fetchPayment,
  fetchPayments,
  recordManualPayment,
  submitPayment,
  verifyPayment,
} from "./payments.api"
import { paymentKeys } from "./payments.constants"
import type {
  PaymentFilterInput,
  RecordManualPaymentInput,
  SubmitPaymentInput,
  VerifyPaymentInput,
} from "./payments.schema"

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
      const labels: Record<string, string> = {
        DEPOSIT: "Deposit proof submitted",
        INSTALLMENT: "Installment payment submitted",
        FULL_BALANCE: "Full balance payment submitted",
      }
      toast.success(`${labels[data.paymentType] ?? "Payment submitted"} successfully`)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
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

      const message = input.action === "VERIFY"
        ? data.paymentType === "DEPOSIT"
          ? "Deposit verified — booking is now confirmed"
          : data.paymentType === "FULL_BALANCE"
            ? "Full balance payment verified"
            : "Installment payment verified"
        : "Payment flagged for resubmission"
      toast.success(message)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useRecordManualPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RecordManualPaymentInput) => recordManualPayment(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: paymentKeys.byBooking(data.bookingId) })
      const labels: Record<string, string> = {
        DEPOSIT: "Deposit recorded — booking confirmed",
        INSTALLMENT: "Installment payment recorded",
        FULL_BALANCE: "Full balance payment recorded",
      }
      toast.success(labels[data.paymentType] ?? "Manual payment recorded")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}
