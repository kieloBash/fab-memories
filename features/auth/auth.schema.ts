// features/auth/auth.schema.ts

import { z } from "zod"

const STAFF_ROLES = ["ADMIN", "COORDINATOR", "VENDOR"] as const

export const createStaffAccountSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-z0-9_-]+$/, "Username may only contain lowercase letters, numbers, hyphens, and underscores"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
  fullName: z.string().min(1, "Full name is required").max(100, "Full name is too long"),
  role: z.enum(STAFF_ROLES, {
    error: () => ({ message: `Role must be one of: ${STAFF_ROLES.join(", ")}` }),
  }),
})

export const updateStaffAccountSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  role: z.enum(STAFF_ROLES).optional(),
  isActive: z.boolean().optional(),
})

export type CreateStaffAccountInput = z.infer<typeof createStaffAccountSchema>
export type UpdateStaffAccountInput = z.infer<typeof updateStaffAccountSchema>
