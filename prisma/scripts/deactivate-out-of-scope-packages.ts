// prisma/scripts/deactivate-out-of-scope-packages.ts
//
// ONE-OFF SCOPE CLEANUP (Bundle 1). The thesis now covers Wedding and Debut events only.
//
// What it does:
//   1. Finds every ACTIVE package whose event type is not Wedding or Debut (Corporate, Birthday, Other)
//      and sets isActive = false. Nothing is deleted — old bookings keep pointing at their package.
//   2. Writes ONE audit entry for the change (system actor, hash-chained like every other entry).
//   3. Lists the bookings that still use an out-of-scope event type, so you can decide what to do with
//      them before the evaluation (they are NOT changed by this script).
//
// Usage:
//   npx tsx prisma/scripts/deactivate-out-of-scope-packages.ts            ← dry run (shows what would change)
//   npx tsx prisma/scripts/deactivate-out-of-scope-packages.ts --apply    ← makes the change
//   npm run scope:cleanup -- --apply                                      ← same, via package.json
//
// Safe to run more than once: the second run finds nothing to deactivate.

import "dotenv/config"
import { prisma } from "@/lib/prisma"
import { auditedTransaction } from "@/lib/audit/log"
import { ACTIVE_EVENT_TYPES } from "@/features/bookings/bookings.constants"
import type { EventType } from "@/app/generated/prisma/client"

const APPLY = process.argv.includes("--apply")
const inScope = [...ACTIVE_EVENT_TYPES] as EventType[]

async function main() {
  const host = (() => {
    try { return new URL(process.env.RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL ?? "").host } catch { return "(unknown)" }
  })()
  console.log(`\n🧹  Scope cleanup — database: ${host}`)
  console.log(`    In scope: ${inScope.join(", ")}   Mode: ${APPLY ? "APPLY" : "DRY RUN (add --apply to change data)"}\n`)

  // ── 1. Packages ────────────────────────────────────────────────
  const toDeactivate = await prisma.package.findMany({
    where: { isActive: true, eventType: { notIn: inScope } },
    select: { id: true, name: true, eventType: true, _count: { select: { bookings: true } } },
    orderBy: { eventType: "asc" },
  })

  if (toDeactivate.length === 0) {
    console.log("  ✅  No active out-of-scope packages — nothing to deactivate.")
  } else {
    for (const p of toDeactivate) {
      console.log(`  •  ${p.eventType.padEnd(10)} "${p.name}"  (${p._count.bookings} booking(s) reference it)`)
    }
    if (APPLY) {
      const ids = toDeactivate.map((p) => p.id)
      const result = await auditedTransaction(async (tx, audit) => {
        const r = await tx.package.updateMany({ where: { id: { in: ids } }, data: { isActive: false } })
        audit({
          userId: null,
          action: "UPDATE",
          module: "BOOKING",
          description: `System scope cleanup deactivated ${r.count} out-of-scope package(s) (Wedding and Debut only)`,
          metadata: {
            packageIds: ids,
            eventTypes: [...new Set(toDeactivate.map((p) => p.eventType))],
            count: r.count,
            changes: { fields: ["isActive"], values: { isActive: false } },
          },
        })
        return r
      })
      console.log(`\n  ✅  Deactivated ${result.count} package(s) and wrote one audit entry.`)
    } else {
      console.log(`\n  ℹ️   Dry run — ${toDeactivate.length} package(s) WOULD be deactivated.`)
    }
  }

  // ── 2. Bookings that still use an out-of-scope type (report only) ──
  const grouped = await prisma.booking.groupBy({
    by: ["eventType", "status"],
    where: { eventType: { notIn: inScope } },
    _count: { _all: true },
  })
  const total = grouped.reduce((n, g) => n + g._count._all, 0)

  console.log(`\n📋  Bookings that still use an out-of-scope event type: ${total}`)
  for (const g of grouped) console.log(`  •  ${g.eventType.padEnd(10)} ${g.status.padEnd(23)} ${g._count._all}`)
  if (total > 0) {
    console.log(
      "\n  These are NOT changed. They still display (with their old label) in lists and reports.\n" +
      "  For a clean evaluation dataset, reseed a test database instead:  npx tsx prisma/seed.ts --fresh --all\n" +
      "  (the seeds now create Wedding and Debut data only — never run --fresh against the live database).",
    )
  }
  console.log("")
}

main()
  .catch((e) => { console.error("\n❌  Scope cleanup failed:", e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
