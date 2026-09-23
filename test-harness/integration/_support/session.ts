// test-harness/integration/_support/session.ts
//
// Who is "signed in" for the next route call. Read by mocks/clerk-auth.ts.
//
//   actAs("admin")                    → a seeded account (role looked up from SEED_ROLES)
//   actAs("itest_x", "COORDINATOR")   → any account, explicit role
//   actAsClerkOnly("user_x", "CLIENT")  → signed in at Clerk, but NO row in our User table (missing-row repair tests)
//   signOut()
import type { Role } from "@/app/generated/prisma/client"

export const SEED_ROLES: Record<string, Role> = {
  admin: "ADMIN",
  coordinator: "COORDINATOR",
  coordinator2: "COORDINATOR",
  coordinator3: "COORDINATOR",
  coordinator4: "COORDINATOR",
  vendor: "VENDOR",
  client_anna: "CLIENT",
  client_ben: "CLIENT",
}

interface SessionState {
  current: { username?: string; clerkId?: string; role: Role } | null
  revocations: number
}

export const session: SessionState = ((globalThis as any).__itestSession ??= { current: null, revocations: 0 })

export function actAs(username: string, role?: Role) {
  const r = role ?? SEED_ROLES[username]
  if (!r) throw new Error(`actAs("${username}") needs an explicit role — it is not a seeded account`)
  session.current = { username, role: r }
}

/** A Clerk session whose user has no row in our database (yet). getCurrentDbUser() finds it by clerkId once repaired. */
export function actAsClerkOnly(clerkId: string, role: Role = "CLIENT") {
  session.current = { clerkId, role }
}

export function signOut() {
  session.current = null
}
