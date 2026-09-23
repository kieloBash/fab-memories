// features/staff-accounts/staff-accounts.schema.ts

import { z } from "zod"
import { STAFF_ROLES } from "./staff-accounts.constants"

const USERNAME = z.string().min(3, "Username must be at least 3 characters").max(30)
  .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores and dots")

export const createStaffAccountSchema = z.object({
  username: USERNAME,
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required").max(100),
  role: z.enum(STAFF_ROLES, { error: `Role must be one of: ${STAFF_ROLES.join(", ")}` }),
})

// A field not sent is left unchanged. `role`/`fullName`/`isActive` may each be sent independently.
export const updateStaffAccountSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100).optional(),
  role: z.enum(STAFF_ROLES, { error: `Role must be one of: ${STAFF_ROLES.join(", ")}` }).optional(),
  isActive: z.boolean().optional(),
})

export type CreateStaffAccountInput = z.infer<typeof createStaffAccountSchema>
export type UpdateStaffAccountInput = z.infer<typeof updateStaffAccountSchema>
