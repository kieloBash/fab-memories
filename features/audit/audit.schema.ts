// features/audit/audit.schema.ts

import { z } from "zod"

const AUDIT_MODULES = [
  "AUTH", "USER_MANAGEMENT", "BOOKING", "PAYMENT",
  "VENDOR", "STAFF_SCHEDULE", "DOCUMENT", "REPORT",
] as const

const AUDIT_ACTIONS = [
  "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE",
  "VERIFY", "CONFIRM", "DECLINE", "EXPORT", "VIEW",
] as const

export const auditFilterSchema = z.object({
  from:     z.string().optional(),
  to:       z.string().optional(),
  userId:   z.string().optional(),
  module:   z.enum(AUDIT_MODULES).optional(),
  action:   z.enum(AUDIT_ACTIONS).optional(),
  status:   z.enum(["SUCCESS", "FAILURE"]).optional(),
  search:   z.string().max(200).optional(),
  page:     z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

export type AuditFilterInput = z.infer<typeof auditFilterSchema>
