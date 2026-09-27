// prisma/seeds/clerk-seed-users.ts
//
// Removes a base-seed account from Clerk before it is re-created. Looks it up EVERY way it can exist — by the stored
// Clerk id, by username, and by both possible emails — so a database that was emptied without wiping Clerk
// (`--fresh --keep-clerk`, `prisma migrate reset`, a manual TRUNCATE) no longer makes the seed fail with
// "username is taken" (FIX K2).
//
// Only the seed's OWN usernames/emails are looked up (admin, coordinator…, client_anna…), and only on a Clerk
// development instance — productionReason() refuses live keys before any seed runs.

import { clerk } from "./_shared"
import { clerkEmailForSeedUser } from "./guards"

export interface SeedUserRef { username: string; email: string; role: string }

export async function removeSeedUserFromClerk(u: SeedUserRef, knownClerkId?: string): Promise<number> {
  const ids = new Set<string>()
  if (knownClerkId) ids.add(knownClerkId)

  const emails = [...new Set([u.email, clerkEmailForSeedUser(u)].map((e) => e.toLowerCase()))]
  const lookups: Record<string, unknown>[] = [{ emailAddress: emails, limit: 10 }, { username: [u.username], limit: 10 }]
  for (const params of lookups) {
    try {
      const r = await clerk.users.getUserList(params as any)
      for (const found of r.data as { id: string }[]) ids.add(found.id)
    } catch {
      /* lookup failed — createUser() will report a clear error if the account still exists */
    }
  }

  let removed = 0
  for (const id of ids) {
    try { await clerk.users.deleteUser(id); removed++ }
    catch (e: any) { if (e?.status !== 404) console.warn(`  ⚠️  could not delete Clerk user ${id} (${u.username}): ${e?.message ?? e}`) }
  }
  return removed
}
