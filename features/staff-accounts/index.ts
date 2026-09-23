// features/staff-accounts/index.ts — client-safe barrel
export { STAFF_ROLES, STAFF_ROLE_LABELS, staffAccountKeys, staffAccountRoutes } from "./staff-accounts.constants"
export type { StaffRole } from "./staff-accounts.constants"
export { createStaffAccountSchema, updateStaffAccountSchema } from "./staff-accounts.schema"
export type { CreateStaffAccountInput, UpdateStaffAccountInput } from "./staff-accounts.schema"
export type { StaffAccount } from "./staff-accounts.types"
export { fetchStaffAccounts, createStaffAccount, updateStaffAccount, deactivateStaffAccount } from "./staff-accounts.api"
export { useStaffAccounts, useCreateStaffAccount, useUpdateStaffAccount, useDeactivateStaffAccount } from "./staff-accounts.hooks"
