// features/staff-accounts/staff-accounts.hooks.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/axios"
import { staffAccountKeys } from "./staff-accounts.constants"
import { createStaffAccount, deactivateStaffAccount, fetchStaffAccounts, updateStaffAccount } from "./staff-accounts.api"
import type { CreateStaffAccountInput, UpdateStaffAccountInput } from "./staff-accounts.schema"

export function useStaffAccounts() {
  return useQuery({ queryKey: staffAccountKeys.list(), queryFn: fetchStaffAccounts })
}

export function useCreateStaffAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateStaffAccountInput) => createStaffAccount(input),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: staffAccountKeys.list() }); toast.success(`${data.fullName}'s account was created`) },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useUpdateStaffAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStaffAccountInput }) => updateStaffAccount(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: staffAccountKeys.list() }); toast.success("Account updated") },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useDeactivateStaffAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateStaffAccount(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: staffAccountKeys.list() }); toast.success("Account deactivated") },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}
