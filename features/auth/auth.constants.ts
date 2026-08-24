// features/auth/auth.constants.ts

export const authKeys = {
  all: ["auth"] as const,
  staffAccounts: () => [...authKeys.all, "staff-accounts"] as const,
  staffAccount: (id: string) => [...authKeys.all, "staff-accounts", id] as const,
} as const

export const authRoutes = {
  staffAccounts: "/staff-accounts",
  staffAccount: (id: string) => `/staff-accounts/${id}`,
} as const
