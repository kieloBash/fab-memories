// features/auth/auth.hooks.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/axios"
import { authKeys } from "./auth.constants"
import {
  createStaffAccount,
  deactivateStaffAccount,
  fetchStaffAccount,
  fetchStaffAccounts,
  updateStaffAccount,
} from "./auth.api"
import type { CreateStaffAccountInput, UpdateStaffAccountInput } from "./auth.schema"

// ── Queries ──────────────────────────────────────────────────────────────────

export function useStaffAccounts() {
  return useQuery({
    queryKey: authKeys.staffAccounts(),
    queryFn: fetchStaffAccounts,
  })
}

export function useStaffAccount(id: string) {
  return useQuery({
    queryKey: authKeys.staffAccount(id),
    queryFn: () => fetchStaffAccount(id),
    enabled: !!id,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateStaffAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateStaffAccountInput) => createStaffAccount(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: authKeys.staffAccounts() })
      toast.success(`Account "${data.username}" created successfully`)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}

export function useUpdateStaffAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStaffAccountInput }) =>
      updateStaffAccount(id, input),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: authKeys.staffAccounts() })
      queryClient.invalidateQueries({ queryKey: authKeys.staffAccount(id) })
      toast.success(`Account "${data.username}" updated successfully`)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}

export function useDeactivateStaffAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deactivateStaffAccount(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: authKeys.staffAccounts() })
      toast.success(`Account "${data.username}" has been deactivated`)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}
