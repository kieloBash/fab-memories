// features/staff-accounts/staff-accounts.api.ts
"use client"

import api from "@/lib/axios"
import { staffAccountRoutes } from "./staff-accounts.constants"
import type { CreateStaffAccountInput, UpdateStaffAccountInput } from "./staff-accounts.schema"
import type { StaffAccount } from "./staff-accounts.types"

export async function fetchStaffAccounts(): Promise<StaffAccount[]> {
  const { data } = await api.get<StaffAccount[]>(staffAccountRoutes.accounts)
  return data
}
export async function createStaffAccount(input: CreateStaffAccountInput): Promise<StaffAccount> {
  const { data } = await api.post<StaffAccount>(staffAccountRoutes.accounts, input)
  return data
}
export async function updateStaffAccount(id: string, input: UpdateStaffAccountInput): Promise<StaffAccount> {
  const { data } = await api.patch<StaffAccount>(staffAccountRoutes.account(id), input)
  return data
}
export async function deactivateStaffAccount(id: string): Promise<StaffAccount> {
  const { data } = await api.delete<StaffAccount>(staffAccountRoutes.account(id))
  return data
}
