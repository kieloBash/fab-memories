// prisma/seeds/cli.ts — the seed runner. Used by prisma/seed.ts (and the old seed-*.ts wrappers).

import { createInterface } from "node:readline/promises"
import { collectClerkUsers, deleteClerkUsers } from "./clerk-wipe"
import { clerkIsStubbed, prisma, type SeedContext, type SeedModule } from "./_shared"
import { SEEDS } from "./index"

const HELP = `
Usage:  npx tsx prisma/seed.ts [options]

  (no options)          Seed the BASE data — but only if the database is empty. Never wipes anything.
  --with=a,b            Also run these add-on seeds after the base (e.g. --with=reports,integrity)
  --all                 Base + every add-on seed
  --only=a,b            Run only these seeds (they need the base data to exist already)
  --reset=a,b           Remove the data these add-ons created (leaves everything else alone)
  --reset-all           Remove the data of every add-on
  --fresh               WIPE the database and EVERY Clerk user, then rebuild (asks for confirmation)
     --yes              skip the confirmation prompt (scripts)
     --keep-clerk       do not wipe Clerk users; only the seeded accounts are replaced
  --list                Show the registered seeds and whether their data is present
  --help                This text

Environment:
  DATABASE_URL                 database OWNER connection (the wipe deletes audit rows — not the app_runtime role)
  CLERK_SECRET_KEY             Clerk instance to seed. --fresh REFUSES a live key (sk_live_…).
  SEED_KEEP_CLERK_EMAILS       comma-separated emails that --fresh must NOT delete from Clerk (e.g. your own login)
  SEED_ADMIN_USERNAME          admin username (default "admin")
`

interface Parsed {
  list: boolean; help: boolean; all: boolean; fresh: boolean; yes: boolean; keepClerk: boolean; resetAll: boolean
  with: string[]; only: string[]; reset: string[]
}

const csv = (args: string[], flag: string) =>
  args.filter((a) => a.startsWith(`${flag}=`)).flatMap((a) => a.slice(flag.length + 1).split(",")).map((s) => s.trim()).filter(Boolean)

function parse(args: string[]): Parsed {
  const has = (f: string) => args.includes(f)
  return {
    list: has("--list"), help: has("--help") || has("-h"), all: has("--all"), fresh: has("--fresh"), yes: has("--yes"),
    keepClerk: has("--keep-clerk"), resetAll: has("--reset-all"),
    with: csv(args, "--with"), only: csv(args, "--only"), reset: csv(args, "--reset"),
  }
}

class UserError extends Error {}

function byName(names: string[]): SeedModule[] {
  return names.map((n) => {
    const s = SEEDS.find((x) => x.name === n)
    if (!s) throw new UserError(`Unknown seed "${n}". Available: ${SEEDS.map((x) => x.name).join(", ")}`)
    return s
  })
}

const base = () => SEEDS.find((s) => s.kind === "base")!

async function baseIsPresent() {
  return (await base().isPresent?.()) ?? false
}

function describeTarget() {
  try {
    const u = new URL(process.env.DATABASE_URL!)
    return `${u.hostname}${u.port ? ":" + u.port : ""}${u.pathname}`
  } catch { return "(unparseable DATABASE_URL)" }
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try { return (await rl.question(question)).trim().toLowerCase() === "yes" } finally { rl.close() }
}

// ── --list ────────────────────────────────────────────────────────

async function list() {
  console.log("\nRegistered seeds (run in this order):\n")
  const basePresent = await baseIsPresent()
  for (const s of SEEDS) {
    const requires = s.requires?.length ? `  requires: ${s.requires.join(", ")}` : ""
    const flags = s.flags?.length ? `  flags: ${s.flags.join(" ")}` : ""
    console.log(`  ${s.name.padEnd(10)} [${s.kind}]  ${s.description}${requires}${flags}`)
    if (s.kind === "base") console.log(`  ${"".padEnd(10)} database ${basePresent ? "already has data" : "is empty"}`)
  }
  console.log("\nRun one:  npx tsx prisma/seed.ts --with=<name>      All:  --all      Help:  --help\n")
}

// ── --reset ───────────────────────────────────────────────────────

async function resetSeeds(names: string[], all: boolean) {
  const targets = all ? SEEDS.filter((s) => s.kind === "addon") : byName(names)
  for (const s of targets) {
    if (!s.reset) throw new UserError(`"${s.name}" cannot be reset on its own${s.kind === "base" ? " — use --fresh to rebuild everything" : ""}.`)
    console.log(`\n🧹  Resetting "${s.name}"…`)
    await s.reset()
  }
}

// ── --fresh ───────────────────────────────────────────────────────

async function wipeDatabase(keepEmails: string[]) {
  // children before parents; the audit tables first because they reference users
  await prisma.$transaction([
    prisma.auditWriteFailure.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.auditChainState.deleteMany(),
    prisma.staffAssignment.deleteMany(),
    prisma.bookingVendor.deleteMany(),
    prisma.vendor.deleteMany(),
    prisma.installment.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.package.deleteMany(),
    prisma.user.deleteMany(keepEmails.length ? { where: { OR: [{ email: null }, { email: { notIn: keepEmails } }] } } : undefined),
  ])
}

async function fresh(a: Parsed, selected: SeedModule[], ctx: SeedContext) {
  const key = process.env.CLERK_SECRET_KEY ?? ""
  const keepEmails = (process.env.SEED_KEEP_CLERK_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)

  // Guard rails — all checked BEFORE anything is deleted
  if (!clerkIsStubbed && !a.keepClerk && key.startsWith("sk_live_"))
    throw new UserError("Refusing to wipe Clerk users: CLERK_SECRET_KEY is a LIVE key (sk_live_…). --fresh only works against a development instance. (Use --keep-clerk to leave Clerk alone.)")
  if (!clerkIsStubbed && !key) throw new UserError("CLERK_SECRET_KEY is required (the base seed creates the accounts in Clerk).")
  const [priv] = await prisma.$queryRaw<{ can: boolean; role: string }[]>`SELECT has_table_privilege(current_user, '"AuditLog"', 'DELETE') AS can, current_user::text AS role`
  if (!priv.can) throw new UserError(`The database role "${priv.role}" cannot delete audit rows, so it cannot wipe the database. Run the seed with the database OWNER connection in DATABASE_URL (not the restricted app_runtime role).`)

  const [users, bookings, audit] = await Promise.all([prisma.user.count(), prisma.booking.count(), prisma.auditLog.count()])
  const clerkPlan = a.keepClerk ? null : await collectClerkUsers(keepEmails)

  console.log("\n⚠️   --fresh will PERMANENTLY DELETE:\n")
  console.log(`   Database  ${describeTarget()}`)
  console.log(`             ${users} users, ${bookings} bookings, ${audit} audit entries, and all payments, vendors, packages, assignments`)
  if (clerkPlan) {
    console.log(`   Clerk     ${clerkPlan.toDelete.length} user(s)${clerkIsStubbed ? "  (OFFLINE STUB — no real Clerk calls)" : ""}`)
    const sample = clerkPlan.toDelete.slice(0, 8).map((u) => u.emails[0] ?? u.id)
    if (sample.length) console.log(`             e.g. ${sample.join(", ")}${clerkPlan.toDelete.length > sample.length ? ", …" : ""}`)
    if (clerkPlan.kept.length) console.log(`   Kept      ${clerkPlan.kept.length} Clerk user(s) on your SEED_KEEP_CLERK_EMAILS list`)
    console.log("             (this will also sign you out everywhere)")
  } else console.log("   Clerk     not touched (--keep-clerk) — only the seeded accounts are replaced")
  console.log(`   Then rebuild: ${selected.map((s) => s.name).join(" + ")}\n`)

  if (!a.yes) {
    if (!process.stdin.isTTY) throw new UserError("Not an interactive terminal — pass --yes to confirm the wipe.")
    if (!(await confirm('Type "yes" to continue: '))) { console.log("Cancelled. Nothing was deleted."); return false }
  }

  console.log("\n🧹  Wiping database…")
  await wipeDatabase(keepEmails)
  console.log("  🗑  Database cleared")

  if (clerkPlan && clerkPlan.toDelete.length) {
    console.log(`\n🧹  Deleting ${clerkPlan.toDelete.length} Clerk user(s)…`)
    const r = await deleteClerkUsers(clerkPlan.toDelete, (d, t) => { if (d === t || d % 25 === 0) process.stdout.write(`\r  ${d}/${t}`) })
    console.log(`\n  🗑  ${r.deleted} deleted${r.failed.length ? `, ${r.failed.length} FAILED:\n     ${r.failed.slice(0, 5).join("\n     ")}` : ""}`)
    if (r.failed.length) throw new UserError("Some Clerk users could not be deleted (listed above). The database was already wiped — fix the cause and re-run --fresh.")
  }

  for (const s of selected) { console.log(`\n▶  ${s.name}`); await s.run(ctx) }
  return true
}

// ── main ──────────────────────────────────────────────────────────

export async function main(argv: string[]) {
  try {
    const a = parse(argv)
    if (a.help) { console.log(HELP); return }
    if (!process.env.DATABASE_URL) throw new UserError("DATABASE_URL is required.")
    const ctx: SeedContext = { args: argv }

    if (a.list) return await list()
    if (a.reset.length || a.resetAll) return await resetSeeds(a.reset, a.resetAll)

    // which seeds?
    let selected: SeedModule[]
    if (a.only.length) selected = byName(a.only)
    else if (a.all) selected = [...SEEDS]
    else selected = [base(), ...byName(a.with).filter((s) => s.kind !== "base")]
    selected = SEEDS.filter((s) => selected.includes(s))                       // registry order, no duplicates

    if (a.fresh) {
      if (!selected.includes(base())) selected = [base(), ...selected]
      await fresh(a, selected, ctx)
      console.log("\n✅  Done.\n")
      return
    }

    for (const s of selected) {
      if (s.kind === "base") {
        if (await s.isPresent?.()) {
          const [u, b] = await Promise.all([prisma.user.count(), prisma.booking.count()])
          console.log(`\n⏭   Skipping "${s.name}": the database already has data (${u} users, ${b} bookings).\n    Nothing was changed. Use --fresh to wipe everything and rebuild.`)
          continue
        }
      } else {
        for (const need of s.requires ?? []) {
          const dep = SEEDS.find((x) => x.name === need)
          if (dep?.isPresent && !(await dep.isPresent())) throw new UserError(`"${s.name}" needs the "${need}" data first. Seed the base first:  npx tsx prisma/seed.ts   (or, to rebuild everything:  npx tsx prisma/seed.ts --fresh --with=${s.name}).`)
        }
      }
      console.log(`\n▶  ${s.name}`)
      await s.run(ctx)
    }
    console.log("\n✅  Done.\n")
  } catch (e) {
    if (e instanceof UserError) { console.error(`\n❌  ${e.message}\n`); process.exitCode = 1 }
    else { console.error("\n❌  Seed failed:", e); process.exitCode = 1 }
  } finally {
    await prisma.$disconnect()
  }
}
