// features/staff-accounts/staff-accounts.constants.ts

// Roles an administrator can create or assign. VENDOR is no longer offered: vendors have no accounts in this
// version and receive a read-only event brief link instead (see Delimitations). Existing VENDOR rows still display.
export const STAFF_ROLES = ["ADMIN", "COORDINATOR"] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export const STAFF_ROLE_LABELS: Record<StaffRole | "VENDOR", string> = {
  ADMIN: "Admin", COORDINATOR: "Coordinator", VENDOR: "Vendor (not used)",
}

export const staffAccountKeys = { all: ["staff-accounts"] as const, list: () => [...staffAccountKeys.all, "list"] as const }
export const staffAccountRoutes = { accounts: "/staff-accounts", account: (id: string) => `/staff-accounts/${id}` } as const
