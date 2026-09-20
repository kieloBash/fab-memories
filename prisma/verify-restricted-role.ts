// prisma/verify-restricted-role.ts
/**
 * Proves the audit table is append-only for the application's database role.
 *
 *   RUNTIME_DATABASE_URL="postgresql://app_runtime:<pw>@host:5432/db" npx tsx prisma/verify-restricted-role.ts
 *
 * It only ever runs statements that are harmless if the protection is (wrongly) missing — UPDATE / DELETE with a
 * WHERE that matches nothing — and checks TRUNCATE by privilege lookup instead of executing it.
 */
import "dotenv/config"
import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const url = process.env.RUNTIME_DATABASE_URL
if (!url) { console.error("Set RUNTIME_DATABASE_URL to the app_runtime connection string."); process.exit(1) }
const app = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })

let passed = 0; const failed: string[] = []
const check = (name: string, ok: boolean, detail?: string) => { if (ok) { passed++; console.log(`  ✅  ${name}`) } else { failed.push(name); console.log(`  ❌  ${name}${detail ? `\n        → ${detail}` : ""}`) } }
const refused = async (sql: string) => {
  try { await app.$executeRawUnsafe(sql); return { refused: false, why: "statement was ALLOWED" } }
  catch (e) { const m = String((e as any)?.message ?? e); return { refused: /permission denied|42501/i.test(m), why: m.split("\n").pop()!.slice(0, 140) } }
}

async function main() {
  const [me] = await app.$queryRaw<{ u: string; sup: boolean }[]>`SELECT current_user::text AS u, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS sup`
  console.log(`\nConnected as "${me.u}"${me.sup ? " (SUPERUSER — this proves nothing; use app_runtime)" : ""}\n`)
  check("connected as a non-superuser", !me.sup)

  console.log("── The audit trail cannot be rewritten through this role")
  for (const [name, sql] of [
    ["UPDATE AuditLog is refused",           `UPDATE "AuditLog" SET "description" = 'tampered' WHERE "sequence" = -1`],
    ["DELETE FROM AuditLog is refused",      `DELETE FROM "AuditLog" WHERE "sequence" = -1`],
    ["UPDATE AuditWriteFailure is refused",  `UPDATE "AuditWriteFailure" SET "error" = 'x' WHERE "id" = 'none'`],
    ["DELETE AuditWriteFailure is refused",  `DELETE FROM "AuditWriteFailure" WHERE "id" = 'none'`],
    ["DELETE AuditChainState is refused",    `DELETE FROM "AuditChainState" WHERE "id" = -1`],
  ] as const) { const r = await refused(sql); check(name, r.refused, r.why) }

  const [p] = await app.$queryRaw<Record<string, boolean>[]>`
    SELECT has_table_privilege(current_user, '"AuditLog"', 'TRUNCATE') AS trunc_log,
           has_table_privilege(current_user, '"AuditChainState"', 'TRUNCATE') AS trunc_state,
           has_table_privilege(current_user, '"Booking"', 'TRUNCATE') AS trunc_booking,
           has_table_privilege(current_user, '"AuditLog"', 'INSERT') AS ins_log,
           has_table_privilege(current_user, '"AuditChainState"', 'UPDATE') AS upd_state`
  check("TRUNCATE AuditLog is not granted",        p.trunc_log === false)
  check("TRUNCATE AuditChainState is not granted", p.trunc_state === false)
  check("TRUNCATE on business tables is not granted", p.trunc_booking === false)

  console.log("\n── The application still works")
  check("INSERT on AuditLog is granted",           p.ins_log === true)
  check("UPDATE on AuditChainState is granted (chain tip can advance)", p.upd_state === true)
  const { logAction } = await import("@/lib/audit/log")
  const marker = `restricted-role check ${Date.now()}`
  await logAction({ action: "VIEW", module: "REPORT", description: marker })
  const written = await app.auditLog.count({ where: { description: marker } })
  check("logAction() writes a chained audit entry", written === 1)
  const { verifyAuditChainIntegrity } = await import("@/features/audit/audit.query")
  const chain = await verifyAuditChainIntegrity()
  check("hash chain verifies under this role", chain.isValid, chain.reason ?? undefined)
  const business = await refused(`UPDATE "User" SET "updatedAt" = "updatedAt" WHERE "id" = 'none'`)
  check("ordinary business writes are still allowed", !business.refused && business.why.includes("ALLOWED"))
  const { getIntegrityReport } = await import("@/features/integrity/integrity.query")
  const rep = await getIntegrityReport()
  const imm = rep.checks.find((c) => c.id === "audit-immutable")!
  check("the System integrity page reports 'Audit table is write-protected: PASS'", imm.status === "pass", imm.summary)

  console.log(`\n${"═".repeat(60)}\n  ${passed} passed, ${failed.length} failed`)
  if (failed.length) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => app.$disconnect())
