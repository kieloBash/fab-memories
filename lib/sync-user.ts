// lib/sync-user.ts
//
// Makes sure a signed-in Clerk account has its row in OUR User table.
//
// Normally the row is created by the Clerk `user.created` webhook (lib/clerk/webhook-handler.ts). When that never
// happened — the webhook was not reachable (local development without a tunnel), or the database was re-seeded while
// the Clerk user was kept — the account can sign in to Clerk but every check in this app says "Unauthorized".
// The password-reset flow used to hide this (it skipped the portal check), so the first ordinary sign-in afterwards
// failed. /api/auth/portal-check now calls ensureDbUser() to repair it at sign-in.
//
// Rules (safe by default):
//   1. A row with this clerkId exists                       → use it.
//   2. A row matches by username or VERIFIED e-mail, and its OLD Clerk account no longer exists
//                                                            → re-link that row to this Clerk account (keeps its role,
//                                                              history and bookings), and write its role back to Clerk.
//   3. A row matches but still belongs to ANOTHER LIVE Clerk account → refuse (never take over someone's record).
//   4. No match                                             → create the row: role from Clerk publicMetadata, else CLIENT
//                                                              (and write CLIENT back to Clerk, like the webhook does).
// Every repair is written to the audit trail. Server-only.
import type { Role, User } from "@/app/generated/prisma/client"
import { logAction } from "@/lib/audit/log"
import { clerkClient } from "@/lib/clerk/client"
import { prisma } from "@/lib/prisma"

const ROLES: readonly Role[] = ["CLIENT", "ADMIN", "COORDINATOR", "VENDOR"]

export type EnsureResult =
  | { ok: true; user: User; outcome: "existing" | "created" | "relinked" }
  | { ok: false; reason: "CLERK_USER_NOT_FOUND" | "CONFLICT" }

type ClerkUserLike = {
  id: string
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  publicMetadata?: Record<string, unknown> | null
  primaryEmailAddressId?: string | null
  emailAddresses?: { id?: string; emailAddress: string; verification?: { status?: string | null } | null }[]
}

const isNotFound = (err: unknown) => {
  const e = err as { status?: number; errors?: { code?: string }[] }
  return e?.status === 404 || e?.errors?.some((x) => x.code === "resource_not_found") === true
}

async function getClerkUser(id: string): Promise<ClerkUserLike | null> {
  const clerk = await clerkClient()
  try {
    return (await clerk.users.getUser(id)) as unknown as ClerkUserLike
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

export async function ensureDbUser(clerkUserId: string): Promise<EnsureResult> {
  const existing = await prisma.user.findUnique({ where: { clerkId: clerkUserId } })
  if (existing) return { ok: true, user: existing, outcome: "existing" }

  const cu = await getClerkUser(clerkUserId)
  if (!cu) return { ok: false, reason: "CLERK_USER_NOT_FOUND" }

  const primary = cu.emailAddresses?.find((e) => e.id && e.id === cu.primaryEmailAddressId) ?? cu.emailAddresses?.[0]
  const email = primary?.emailAddress ?? null
  const emailVerified = primary?.verification?.status === "verified"
  const username = cu.username ?? null

  // ── rules 2 & 3: an existing row for the same person under an old / different Clerk id ──
  const match: { username?: string; email?: string }[] = []
  if (username) match.push({ username })
  if (email) match.push({ email })
  const candidates = match.length ? await prisma.user.findMany({ where: { OR: match } }) : []

  if (candidates.length) {
    const relinkable: User[] = []
    for (const c of candidates) {
      const byVerifiedEmail = !!email && c.email === email && emailVerified
      const byUsername = !!username && c.username === username
      const oldAccountGone = (await getClerkUser(c.clerkId)) === null
      if ((byVerifiedEmail || byUsername) && oldAccountGone) relinkable.push(c)
      else {
        await logAction({
          userId: c.id, action: "LOGIN", module: "AUTH", status: "FAILURE",
          description: "Sign-in refused — the account record belongs to a different sign-in identity",
          metadata: { event: "ACCOUNT_LINK_CONFLICT", clerkUserId },
        })
        return { ok: false, reason: "CONFLICT" }
      }
    }
    if (relinkable.length > 1) return { ok: false, reason: "CONFLICT" } // two different old records: don't guess
    const row = relinkable[0]
    const user = await prisma.user.update({ where: { id: row.id }, data: { clerkId: clerkUserId } })
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(clerkUserId, { publicMetadata: { role: user.role } })
    await logAction({
      userId: user.id, action: "UPDATE", module: "AUTH",
      description: `${user.role} account record re-linked to its new sign-in identity`,
      metadata: { event: "ACCOUNT_RELINKED", previousClerkId: row.clerkId, clerkUserId },
    })
    return { ok: true, user, outcome: "relinked" }
  }

  // ── rule 4: create the missing row ──
  const metaRole = cu.publicMetadata?.role as Role | undefined
  const role: Role = metaRole && ROLES.includes(metaRole) ? metaRole : "CLIENT"
  if (!metaRole) {
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(clerkUserId, { publicMetadata: { role: "CLIENT" } })
  }
  const user = await prisma.user.upsert({
    where: { clerkId: clerkUserId },
    update: {},
    create: {
      clerkId: clerkUserId,
      email,
      username,
      fullName: `${cu.firstName ?? ""} ${cu.lastName ?? ""}`.trim() || username || "Unnamed User",
      role,
    },
  })
  await logAction({
    userId: user.id, action: "CREATE", module: "AUTH",
    description: `${role} account record created at sign-in (it was missing from the database)`,
    metadata: { event: "ACCOUNT_SYNCED_AT_SIGN_IN", clerkUserId, role },
  })
  return { ok: true, user, outcome: "created" }
}
