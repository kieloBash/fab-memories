// prisma/seeds/guards.ts
//
// Pure rules for the seed runner — no database or Clerk imports, so they can be unit-tested on their own.
//
//   WIPE_ORDER            which tables `--fresh` empties, children first (FIX K1)
//   productionReason()    why seeding must be refused here (FIX K3)
//   clerkEmailForSeedUser the email a base-seed account gets IN CLERK (FIX K2 — cleanup must look for this one)

/**
 * Prisma model delegates `--fresh` deletes, in order: every table that references User comes BEFORE "user", which is
 * always last (it gets the keep-list filter). test-harness/unit/seed-guards.unit.test.ts fails if a model is added to
 * prisma/schema.prisma and not listed here.
 *
 * FIX K1: notification and coordinatorUnavailability were missing. Both reference User with ON DELETE RESTRICT, so
 * the wipe failed (and rolled back) as soon as anyone had a notification or an unavailability day.
 */
export const WIPE_ORDER = [
  "auditWriteFailure",
  "auditLog",
  "auditChainState",
  "notification",
  "emailLog",
  "coordinatorUnavailability",
  "staffAssignment",
  "bookingVendor",
  "vendor",
  "installment",
  "payment",
  "booking",
  "package",
  "user",
] as const

export type WipeModel = (typeof WIPE_ORDER)[number]

/**
 * Returns why seeding (creating demo data or wiping) is not allowed in this environment, or null when it is.
 * The base seed creates accounts with a PUBLISHED password — it must never reach a production Clerk instance
 * or a production build. Listing (--list) and removing add-on data (--reset) stay allowed.
 */
export function productionReason(env: Record<string, string | undefined> = process.env): string | null {
  if (env.SEED_CLERK_STUB) return null // offline fake Clerk — nothing real is touched
  if ((env.CLERK_SECRET_KEY ?? "").startsWith("sk_live_"))
    return "CLERK_SECRET_KEY is a LIVE key (sk_live_…). Seeding creates demo accounts with a published password and wipes data — it only runs against a Clerk development instance (sk_test_…)."
  if (env.NODE_ENV === "production")
    return "NODE_ENV is \"production\". Seeding only runs in development / test environments."
  return null
}

/**
 * The email a base-seed account is created with IN CLERK. Staff get a placeholder (their database row has no email);
 * clients get their real email. createUser() and the cleanup both use this, so they can never disagree again.
 *
 * FIX K2: the cleanup used to look staff up by their `email` field (e.g. admin.fabmemories@example.com) while Clerk
 * had them as seed.admin@example.com — so emptying the database without also wiping Clerk made the next seed fail
 * with "username is taken".
 */
export function clerkEmailForSeedUser(u: { username: string; email: string; role: string }): string {
  return u.role === "CLIENT" ? u.email : `seed.${u.username}@example.com`
}
