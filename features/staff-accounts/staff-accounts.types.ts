// features/staff-accounts/staff-accounts.types.ts
import type { Role } from "@/app/generated/prisma/client"

export interface StaffAccount {
  id: string
  username: string | null
  fullName: string
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
}
