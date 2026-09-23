// features/staff-accounts/staff-accounts.constants.ts

export const STAFF_ROLES = ["ADMIN", "COORDINATOR", "VENDOR"] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  ADMIN: "Admin", COORDINATOR: "Coordinator", VENDOR: "Vendor",
}

export const staffAccountKeys = { all: ["staff-accounts"] as const, list: () => [...staffAccountKeys.all, "list"] as const }
export const staffAccountRoutes = { accounts: "/staff-accounts", account: (id: string) => `/staff-accounts/${id}` } as const
