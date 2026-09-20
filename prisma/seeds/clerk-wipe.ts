// prisma/seeds/clerk-wipe.ts
//
// Deletes Clerk users for `--fresh`. Two steps so the caller can show what will happen and ask first.

import { clerk } from "./_shared"

export interface ClerkUserLite { id: string; emails: string[] }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Every user in the Clerk instance, except those whose email is in `keepEmails`. */
export async function collectClerkUsers(keepEmails: string[]): Promise<{ toDelete: ClerkUserLite[]; kept: ClerkUserLite[] }> {
  const keep = new Set(keepEmails.map((e) => e.trim().toLowerCase()).filter(Boolean))
  const all: ClerkUserLite[] = []
  const LIMIT = 100
  for (let offset = 0; ; offset += LIMIT) {
    const page = await clerk.users.getUserList({ limit: LIMIT, offset })
    for (const u of page.data as any[]) all.push({ id: u.id, emails: (u.emailAddresses ?? []).map((e: any) => String(e.emailAddress).toLowerCase()) })
    if (page.data.length < LIMIT) break
  }
  return {
    toDelete: all.filter((u) => !u.emails.some((e) => keep.has(e))),
    kept: all.filter((u) => u.emails.some((e) => keep.has(e))),
  }
}

/** Deletes the given users one by one, pausing briefly and backing off when Clerk answers 429 (rate limited). */
export async function deleteClerkUsers(users: ClerkUserLite[], onProgress?: (done: number, total: number) => void): Promise<{ deleted: number; failed: string[] }> {
  let deleted = 0
  const failed: string[] = []
  for (const u of users) {
    let ok = false
    for (let attempt = 0; attempt < 6 && !ok; attempt++) {
      try { await clerk.users.deleteUser(u.id); ok = true }
      catch (e: any) {
        if (e?.status === 404) { ok = true; break }                                   // already gone
        if (e?.status === 429) { await sleep((Number(e?.retryAfter) || 0.2 * 2 ** attempt) * 1000); continue }
        failed.push(`${u.id}: ${e?.message ?? e}`); break
      }
    }
    if (ok) deleted++
    else if (!failed.some((f) => f.startsWith(u.id))) failed.push(`${u.id}: gave up after repeated rate limiting`)
    onProgress?.(deleted + failed.length, users.length)
    await sleep(40)
  }
  return { deleted, failed }
}
