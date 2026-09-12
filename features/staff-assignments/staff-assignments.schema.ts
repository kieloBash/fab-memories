// features/staff-assignments/staff-assignments.schema.ts

import { z } from "zod"

const STAFF_TASK_ROLES = [
  "LEAD_COORDINATOR", "GUEST_REGISTRATION", "VENDOR_LIAISON",
  "LOGISTICS", "PROGRAM_FLOW", "OTHER",
] as const

export const assignStaffSchema = z.object({
  coordinatorId: z.string().min(1, "Coordinator is required"),
  taskRole:      z.enum(STAFF_TASK_ROLES, { error: "Invalid task role" }),
  taskNote:      z.string().max(200).optional(),
  isBackup:      z.boolean().optional(),
  notes:         z.string().max(500).optional(),
})

export const updateStaffAssignmentSchema = z.object({
  taskRole: z.enum(STAFF_TASK_ROLES).optional(),
  taskNote: z.string().max(200).optional(),
  isBackup: z.boolean().optional(),
  notes:    z.string().max(500).optional(),
})

export type AssignStaffInput           = z.infer<typeof assignStaffSchema>
export type UpdateStaffAssignmentInput = z.infer<typeof updateStaffAssignmentSchema>
export type StaffTaskRole              = typeof STAFF_TASK_ROLES[number]
