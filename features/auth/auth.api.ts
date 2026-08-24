// features/auth/auth.api.ts
"use client"

import api from "@/lib/axios"
import { authRoutes } from "./auth.constants"
import type { StaffAccount } from "./auth.types"
import type { CreateStaffAccountInput, UpdateStaffAccountInput } from "./auth.schema"

export async function fetchStaffAccounts(): Promise<StaffAccount[]> {
  const { data } = await api.get<StaffAccount[]>(authRoutes.staffAccounts)
  return data
}

export async function fetchStaffAccount(id: string): Promise<StaffAccount> {
  const { data } = await api.get<StaffAccount>(authRoutes.staffAccount(id))
  return data
}

export async function createStaffAccount(
  input: CreateStaffAccountInput,
): Promise<StaffAccount> {
  const { data } = await api.post<StaffAccount>(authRoutes.staffAccounts, input)
  return data
}

export async function updateStaffAccount(
  id: string,
  input: UpdateStaffAccountInput,
): Promise<StaffAccount> {
  const { data } = await api.patch<StaffAccount>(authRoutes.staffAccount(id), input)
  return data
}

export async function deactivateStaffAccount(id: string): Promise<StaffAccount> {
  const { data } = await api.delete<StaffAccount>(authRoutes.staffAccount(id))
  return data
}
