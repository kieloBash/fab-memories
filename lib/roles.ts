import { auth } from '@clerk/nextjs/server'
import { ensureUser } from '@/lib/sync-user'
import type { AppRole } from '@/types/globals'

/** Reads the role from the session token — no network call, no DB hit. */
export async function getCurrentRole(): Promise<AppRole | null> {
  const { sessionClaims } = await auth()
  return sessionClaims?.metadata?.role ?? null
}

export async function hasRole(...allowed: AppRole[]): Promise<boolean> {
  const role = await getCurrentRole()
  return role !== null && allowed.includes(role)
}

/**
 * Throws if the caller lacks the role. Call at the TOP of every server action
 * and route handler — NFR-16 requires enforcement at the API layer, not just
 * in middleware. Middleware is routing; this is authorization.
 */
export async function requireRole(...allowed: AppRole[]) {
  const { userId } = await auth()
  if (!userId) throw new Error('UNAUTHENTICATED')

  const role = await getCurrentRole()
  if (!role || !allowed.includes(role)) throw new Error('FORBIDDEN')

  return { clerkId: userId, role }
}

export async function getCurrentDbUser() {
  return ensureUser()
}

export async function requireDbUser() {
  const user = await ensureUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  if (!user.isActive) throw new Error('ACCOUNT_DISABLED')
  return user
}
