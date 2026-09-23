// test-harness/integration/_support/mocks/clerk-auth.ts — stands in for lib/clerk/auth.ts (same exports)
import type { Role } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { session } from "../session"

export async function getCurrentRole(): Promise<Role | null> {
  return session.current?.role ?? null
}

export async function getCurrentDbUser() {
  const s = session.current
  if (!s) return null
  if (s.username) return prisma.user.findUnique({ where: { username: s.username } })
  return prisma.user.findUnique({ where: { clerkId: s.clerkId! } })
}

export async function getCurrentClerkId(): Promise<string | null> {
  const s = session.current
  if (!s) return null
  return s.clerkId ?? (await getCurrentDbUser())?.clerkId ?? null
}

export async function getCurrentClerkUser() {
  return null
}

export async function requireRole(allowedRoles: Role[]): Promise<Role> {
  const role = session.current?.role
  if (!role) throw new Error("UNAUTHENTICATED")
  if (!allowedRoles.includes(role)) throw new Error("FORBIDDEN")
  return role
}

export async function requireAdmin(): Promise<void> {
  await requireRole(["ADMIN"])
}

export async function revokeCurrentSession(): Promise<boolean> {
  session.revocations++
  return true
}
