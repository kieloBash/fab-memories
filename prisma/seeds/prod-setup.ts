// prisma/seeds/prod-setup.ts
//
// PRODUCTION SETUP SEED — creates the starting data for the LIVE system:
//   • 1 administrator + 2 coordinators (credentials from PROD_* environment variables, never from code)
//   • the service packages and vendors listed in prisma/seeds/prod/prod-data.ts
//
// This is NOT one of the demo seeds and is deliberately NOT registered in prisma/seeds/index.ts, so `--all`,
// `--fresh` and the other demo commands can never run it. The opposite is true too: the demo seeds refuse a live
// Clerk key, this one is made for it.
//
// Safety:
//   • Never deletes or overwrites anything. Users are matched by username (and email), packages by name + event type,
//     vendors by name — anything that already exists is skipped and reported. Safe to run again.
//   • Dry run by default. --apply makes the changes, after you type "yes" (or pass --yes).
//   • Refuses to start if a migration is not applied, a PROD_* value is missing/weak, or a package is out of scope.
//   • Every change is written to the audit trail: one entry per staff account, one for the catalog.
//
// Usage (full walkthrough: documents/PROD_SETUP_SEED.md):
//   npm run seed:prod                         ← dry run
//   npm run seed:prod -- --apply              ← create (asks for "yes")
//   npm run seed:prod -- --apply --yes        ← no prompt (scripts / CI)

import { readdirSync, statSync } from "node:fs"
import { createInterface } from "node:readline/promises"
import { fileURLToPath } from "node:url"
import { writeAuditEntry } from "@/lib/audit/log"
import { ACTIVE_EVENT_TYPES } from "@/features/bookings/bookings.constants"
import { clerk, prisma } from "./_shared"
import { PROD_PACKAGES, PROD_VENDORS } from "./prod/prod-data"
import {
  describeTarget, pendingMigrations, readProdAccounts, staffPlaceholderEmail, type ProdAccount,
} from "./prod/prod-rules"

const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const YES = args.includes("--yes")

type Outcome = "created" | "exists" | "conflict" | "failed" | "would create"
const report: { kind: string; label: string; outcome: Outcome; note?: string }[] = []
const line = (kind: string, label: string, outcome: Outcome, note?: string) => {
  report.push({ kind, label, outcome, note })
  const icon = { created: "✅", exists: "⏭ ", conflict: "⚠️ ", failed: "❌", "would create": "➕" }[outcome]
  console.log(`  ${icon}  ${kind.padEnd(11)} ${label}${note ? `  — ${note}` : ""}`)
}

// ── Pre-flight ──────────────────────────────────────────────────────

async function checkMigrations(): Promise<string | null> {
  const dir = fileURLToPath(new URL("../migrations", import.meta.url))
  const onDisk = readdirSync(dir).filter((n) => statSync(`${dir}/${n}`).isDirectory())
  let applied: string[]
  try {
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
    applied = rows.map((r) => r.migration_name)
  } catch {
    return "The database has no migration history. Run `npx prisma migrate deploy` against it first."
  }
  const pending = pendingMigrations(onDisk, applied)
  return pending.length
    ? `${pending.length} migration(s) not applied (${pending.slice(0, 3).join(", ")}${pending.length > 3 ? ", …" : ""}). Run \`npx prisma migrate deploy\` first.`
    : null
}

function checkCatalog(): string[] {
  const errors: string[] = []
  const inScope = ACTIVE_EVENT_TYPES as readonly string[]
  for (const p of PROD_PACKAGES) {
    if (!inScope.includes(p.eventType)) errors.push(`Package "${p.name}": event type ${p.eventType} is out of scope (Wedding and Debut only)`)
    if (!(p.price > 0)) errors.push(`Package "${p.name}": price must be greater than zero`)
    if (!p.inclusions.length) errors.push(`Package "${p.name}": add at least one inclusion`)
  }
  const names = PROD_VENDORS.map((v) => v.name.trim().toLowerCase())
  if (new Set(names).size !== names.length) errors.push("prod-data.ts lists the same vendor name twice")
  return errors
}

async function confirm(): Promise<boolean> {
  if (YES) return true
  if (!process.stdin.isTTY) {
    console.error("\n❌  Not an interactive terminal. Re-run with --yes to confirm.")
    return false
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question('\nType "yes" to create the items marked ➕ above: ')
  rl.close()
  return answer.trim().toLowerCase() === "yes"
}

// ── Staff accounts ──────────────────────────────────────────────────

type Plan = { account: ProdAccount; action: "create" | "skip" }

/** Decides, read-only, what happens to each account. */
async function planAccount(a: ProdAccount): Promise<Plan> {
  const label = `${a.username} (${a.role.toLowerCase()})`
  const byUsername = await prisma.user.findUnique({ where: { username: a.username }, select: { role: true } })
  if (byUsername) {
    const note = byUsername.role === a.role ? "already in the database" : `exists with role ${byUsername.role} — NOT changed`
    line("account", label, byUsername.role === a.role ? "exists" : "conflict", note)
    return { account: a, action: "skip" }
  }
  const byEmail = await prisma.user.findUnique({ where: { email: a.email }, select: { id: true } })
  if (byEmail) {
    line("account", label, "conflict", "another user already has this email — use a different PROD_*_EMAIL")
    return { account: a, action: "skip" }
  }
  const inClerk = await clerk.users.getUserList({ username: [a.username], limit: 1 })
  if (inClerk.data.length) {
    line("account", label, "conflict", "username exists in Clerk but not in the database — delete it in the Clerk dashboard or pick another username")
    return { account: a, action: "skip" }
  }
  line("account", label, "would create")
  return { account: a, action: "create" }
}

/**
 * Same steps as POST /api/staff-accounts: Clerk account (username sign-in, placeholder email, role in metadata),
 * then the database row + an audit entry in ONE transaction. If the database step fails, the Clerk account is
 * deleted again so nothing is left half-created.
 */
async function createAccount(a: ProdAccount): Promise<void> {
  const label = `${a.username} (${a.role.toLowerCase()})`
  let clerkId: string | null = null
  try {
    const cu = await clerk.users.createUser({
      username: a.username,
      password: a.password,
      emailAddress: [staffPlaceholderEmail(a.username)],
      publicMetadata: { role: a.role },
      skipPasswordChecks: false,
    })
    clerkId = cu.id

    // UPSERT on clerkId, not create: the Clerk `user.created` webhook may insert this row first (with the placeholder
    // email and no full name). Whichever runs first, the row ends up with the real email, full name and role.
    // One retry covers the rare case where both inserts race and one hits the unique index.
    const write = () => prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { clerkId: cu.id },
        create: { clerkId: cu.id, username: a.username, fullName: a.fullName, email: a.email, role: a.role },
        update: { username: a.username, fullName: a.fullName, email: a.email, role: a.role, isActive: true },
      })
      await writeAuditEntry(tx, {
        userId: null,
        action: "CREATE",
        module: "USER_MANAGEMENT",
        description: `Production setup created ${a.role} account`,
        metadata: { targetUserId: user.id, role: a.role, source: "prod-setup" },
      })
    })
    try { await write() } catch (e: unknown) {
      if ((e as { code?: string } | null)?.code !== "P2002") throw e
      await new Promise((r) => setTimeout(r, 500))
      await write()
    }
    line("account", label, "created", `signs in at /staff-login · alerts go to ${a.email}`)
  } catch (err: unknown) {
    if (clerkId) await clerk.users.deleteUser(clerkId).catch(() => console.error(`     ⚠️  Could not remove Clerk user ${clerkId} — delete it in the Clerk dashboard.`))
    // Clerk API errors carry a readable message in errors[0] (e.g. "Password has been found in an online data breach").
    const e = err as { errors?: { longMessage?: string; message?: string }[]; message?: string } | null
    const clerkMsg = e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message
    line("account", label, "failed", clerkMsg ?? String(e?.message ?? err))
  }
}

// ── Catalog ─────────────────────────────────────────────────────────

async function planCatalog() {
  const newPackages: typeof PROD_PACKAGES = []
  for (const p of PROD_PACKAGES) {
    const found = await prisma.package.findFirst({ where: { name: p.name, eventType: p.eventType }, select: { id: true } })
    const label = `${p.eventType.padEnd(8)} ${p.name}`
    if (found) line("package", label, "exists", "not changed — edit prices on the admin Packages page")
    else { newPackages.push(p); line("package", label, "would create") }
  }
  const newVendors: typeof PROD_VENDORS = []
  for (const v of PROD_VENDORS) {
    const found = await prisma.vendor.findFirst({ where: { name: { equals: v.name, mode: "insensitive" } }, select: { id: true } })
    if (found) line("vendor", v.name, "exists", "not changed")
    else { newVendors.push(v); line("vendor", v.name, "would create") }
  }
  if (!PROD_VENDORS.length) console.log("  ℹ️   vendor      none listed in prod-data.ts — add real partners there or on the admin Vendors page")
  return { newPackages, newVendors }
}

async function createCatalog(newPackages: typeof PROD_PACKAGES, newVendors: typeof PROD_VENDORS) {
  if (!newPackages.length && !newVendors.length) return
  // Packages, vendors and their audit entry commit together — or not at all.
  const { packageIds, vendorIds } = await prisma.$transaction(async (tx) => {
    const packageIds: string[] = []
    for (const p of newPackages) {
      const row = await tx.package.create({
        data: {
          name: p.name, description: p.description, eventType: p.eventType, price: p.price,
          priceProvincial: p.priceProvincial ?? null, inclusions: p.inclusions, isActive: true,
        },
      })
      packageIds.push(row.id)
    }
    const vendorIds: string[] = []
    for (const v of newVendors) {
      const row = await tx.vendor.create({
        data: {
          name: v.name, category: v.category, contactName: v.contactName ?? null, contactPhone: v.contactPhone ?? null,
          contactEmail: v.contactEmail ?? null, contactChannel: v.contactChannel ?? null,
          coverageAreas: v.coverageAreas, notes: v.notes ?? null, isActive: true,
        },
      })
      vendorIds.push(row.id)
    }
    await writeAuditEntry(tx, {
      userId: null,
      action: "CREATE",
      module: "BOOKING", // packages are logged under BOOKING, as in POST /api/packages
      description: `Production setup created ${packageIds.length} package(s) and ${vendorIds.length} vendor(s)`,
      metadata: { packageIds, vendorIds, source: "prod-setup" },
    })
    return { packageIds, vendorIds }
  }, { timeout: 30_000 })

  console.log(`  ✅  catalog     ${packageIds.length} package(s), ${vendorIds.length} vendor(s) created + 1 audit entry`)
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const t = describeTarget()
  console.log("\n🏁  Fab Memories — production setup seed")
  console.log(`    Database : ${t.databaseHost}/${t.databaseName}`)
  console.log(`    Clerk    : ${t.clerkMode}${t.clerkMode === "LIVE" ? "  (real accounts will be created)" : ""}`)
  console.log(`    Mode     : ${APPLY ? "APPLY" : "DRY RUN — nothing is changed (add --apply)"}\n`)

  const { accounts, errors } = readProdAccounts()
  errors.push(...checkCatalog())
  if (t.clerkMode === "missing") errors.push("CLERK_SECRET_KEY is not set")
  if (!process.env.DATABASE_URL) errors.push("DATABASE_URL is not set")
  if (!errors.length) {
    const m = await checkMigrations()
    if (m) errors.push(m)
  }
  if (errors.length) {
    console.error("❌  Cannot continue:\n" + errors.map((e) => `    • ${e}`).join("\n") + "\n")
    process.exitCode = 1
    return
  }

  console.log("📋  Plan\n")
  const plans: Plan[] = []
  for (const a of accounts) plans.push(await planAccount(a))
  const { newPackages, newVendors } = await planCatalog()

  const toCreate = plans.filter((p) => p.action === "create").length + newPackages.length + newVendors.length
  if (!toCreate) {
    console.log("\n✔  Nothing to create — production data is already in place.\n")
    return
  }
  if (!APPLY) {
    console.log(`\nℹ️   Dry run: ${toCreate} item(s) would be created. Re-run with --apply to create them.\n`)
    return
  }
  if (!(await confirm())) {
    console.log("\nCancelled — nothing was changed.\n")
    return
  }

  console.log("\n🔨  Creating\n")
  for (const p of plans) if (p.action === "create") await createAccount(p.account)
  await createCatalog(newPackages, newVendors)

  const failed = report.filter((r) => r.outcome === "failed").length
  const conflicts = report.filter((r) => r.outcome === "conflict").length
  console.log(`\n${failed ? "⚠️ " : "✔ "}  Done. ${failed} failed, ${conflicts} conflict(s) skipped. Safe to re-run after fixing.\n`)
  if (failed) process.exitCode = 1
}

main()
  .catch((e) => { console.error("\n❌  Production setup failed:", e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
