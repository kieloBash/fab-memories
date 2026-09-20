// features/integrity/integrity.query.ts
//
// "Is the system as trustworthy as it claims to be?" — five live checks an admin can run
// (and a panel can be shown) at any time. Server-only; NOT a "use server" module.

import { verifyAuditChainIntegrity } from "@/features/audit/audit.query"
import { prisma } from "@/lib/prisma"
import type { CheckStatus, IntegrityCheck, IntegrityReport } from "./integrity.types"

const RANK: Record<CheckStatus, number> = { pass: 0, warn: 1, fail: 2 }
const worst = (list: CheckStatus[]): CheckStatus => list.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "pass" as CheckStatus)
const ymd = (d: Date) => d.toISOString().slice(0, 10)

// ── 1. Audit hash chain + tip anchor ─────────────────────────────

async function checkAuditChain(): Promise<IntegrityCheck> {
  const chain = await verifyAuditChainIntegrity()
  if (chain.isValid) {
    return {
      id: "audit-chain", title: "Audit trail is untampered", status: "pass",
      summary: `All ${chain.totalEntries.toLocaleString()} entries verify, and the recorded chain tip (#${chain.tip?.recordedSequence ?? 0}) matches the last entry.`,
      detail: ["Every entry's hash was recomputed and linked to its predecessor.", "The chain tip was compared with the last entry, so deleted trailing entries would be caught."],
    }
  }
  return {
    id: "audit-chain", title: "Audit trail is untampered", status: "fail",
    summary: `Tampering detected at or after entry #${chain.brokenAtSequence}.`,
    detail: [chain.reason ?? "The hash chain does not verify."],
    remedy: "Treat this as a security incident. Restore the audit tables from a backup taken before the change, and review who had database access.",
  }
}

// ── 2. Can the app's own database role rewrite history? ──────────

async function checkAuditImmutable(): Promise<{ check: IntegrityCheck; role: string }> {
  const [row] = await prisma.$queryRaw<{ role: string; sup: boolean; ins: boolean; upd: boolean; del: boolean; trunc: boolean; state_upd: boolean }[]>`
    SELECT current_user::text AS role,
           COALESCE((SELECT rolsuper FROM pg_roles WHERE rolname = current_user), false) AS sup,
           has_table_privilege(current_user, '"AuditLog"', 'INSERT')   AS ins,
           has_table_privilege(current_user, '"AuditLog"', 'UPDATE')   AS upd,
           has_table_privilege(current_user, '"AuditLog"', 'DELETE')   AS del,
           has_table_privilege(current_user, '"AuditLog"', 'TRUNCATE') AS trunc,
           has_table_privilege(current_user, '"AuditChainState"', 'UPDATE') AS state_upd
  `
  const source = process.env.RUNTIME_DATABASE_URL ? "RUNTIME_DATABASE_URL" : "DATABASE_URL (fallback)"
  const can = [row.upd && "UPDATE", row.del && "DELETE", row.trunc && "TRUNCATE"].filter(Boolean) as string[]
  const facts = [`Connected as database role "${row.role}" via ${source}${row.sup ? " (a superuser)" : ""}.`]

  if (!row.ins || !row.state_upd) {
    return {
      role: row.role,
      check: {
        id: "audit-immutable", title: "Audit table is write-protected", status: "fail",
        summary: "The app's database role cannot write new audit entries — every audited action will fail.",
        detail: [...facts, `INSERT on AuditLog: ${row.ins ? "yes" : "NO"} · UPDATE on AuditChainState: ${row.state_upd ? "yes" : "NO"}`],
        remedy: "Re-run prisma/scripts/create-restricted-role.sql — the role needs INSERT on AuditLog and UPDATE on AuditChainState.",
      },
    }
  }
  if (can.length === 0) {
    return {
      role: row.role,
      check: {
        id: "audit-immutable", title: "Audit table is write-protected", status: "pass",
        summary: "The app's database role can add audit entries but cannot UPDATE, DELETE or TRUNCATE them.",
        detail: [...facts, "Even a compromised application cannot rewrite history through its own connection."],
      },
    }
  }
  return {
    role: row.role,
    check: {
      id: "audit-immutable", title: "Audit table is write-protected", status: "warn",
      summary: `The app's database role can ${can.join(", ")} audit entries. The hash chain would still DETECT tampering, but the database does not PREVENT it.`,
      detail: facts,
      remedy: "Run prisma/scripts/create-restricted-role.sql as the database owner, then point RUNTIME_DATABASE_URL at the new app_runtime role (keep DIRECT_URL on the owner for migrations and seeding).",
    },
  }
}

// ── 3. Is the one-booking-per-date rule enforced by the database? ─

async function checkDateIndex(): Promise<IntegrityCheck> {
  const rows = await prisma.$queryRaw<{ uniq: boolean; predicate: string | null }[]>`
    SELECT i.indisunique AS uniq, pg_get_expr(i.indpred, i.indrelid) AS predicate
    FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
    WHERE c.relname = 'Booking_held_eventDate_key'
  `
  const idx = rows[0]
  const ok = !!idx && idx.uniq && /CONFIRMED/.test(idx.predicate ?? "") && /CANCELLATION_REQUESTED/.test(idx.predicate ?? "")
  if (ok) {
    return {
      id: "one-per-date-index", title: "One booking per date is enforced by the database", status: "pass",
      summary: "A unique index prevents two CONFIRMED (or cancellation-pending) bookings on the same date — even under concurrent requests.",
      detail: [`Index "Booking_held_eventDate_key" is unique and applies to: ${idx.predicate}`],
    }
  }
  return {
    id: "one-per-date-index", title: "One booking per date is enforced by the database", status: "fail",
    summary: idx ? "The date index exists but does not cover both held statuses." : "The one-booking-per-date index is missing — only application code protects the rule.",
    detail: idx ? [`Current predicate: ${idx.predicate ?? "(none)"}`] : [],
    remedy: "Apply the migration 20260920100000_one_held_booking_per_date (prisma migrate deploy). If it aborts, run prisma/scripts/find-date-conflicts.sql and resolve the listed dates first.",
  }
}

// ── 4. Does today's data obey the rules? ─────────────────────────

async function checkRuleViolations(): Promise<IntegrityCheck> {
  const [doubleHeld, noDeposit] = await Promise.all([
    prisma.$queryRaw<{ d: Date; n: number }[]>`
      SELECT "eventDate" AS d, count(*)::int AS n FROM "Booking"
      WHERE "status" IN ('CONFIRMED', 'CANCELLATION_REQUESTED')
      GROUP BY "eventDate" HAVING count(*) > 1 ORDER BY "eventDate" LIMIT 10`,
    prisma.$queryRaw<{ id: string; d: Date }[]>`
      SELECT b."id", b."eventDate" AS d FROM "Booking" b
      WHERE b."status" = 'CONFIRMED'
        AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p."bookingId" = b."id" AND p."paymentType" = 'DEPOSIT' AND p."status" = 'VERIFIED')
      ORDER BY b."eventDate" LIMIT 10`,
  ])
  const detail = [
    ...doubleHeld.map((r) => `${ymd(r.d)}: ${r.n} bookings hold the same date`),
    ...noDeposit.map((r) => `Booking ${r.id} (${ymd(r.d)}) is CONFIRMED without a verified deposit`),
  ]
  if (detail.length === 0) {
    return {
      id: "rule-violations", title: "No booking breaks a business rule", status: "pass",
      summary: "No date is held twice, and every confirmed booking has a verified deposit.",
      detail: [],
    }
  }
  return {
    id: "rule-violations", title: "No booking breaks a business rule", status: "fail",
    summary: `${doubleHeld.length + noDeposit.length} record(s) violate a booking rule.`,
    detail,
    remedy: "Fix each record: cancel or decline the duplicate booking, or record/verify the missing deposit. (Records created by an old code path or direct database edits can look like this; the new gate makes new ones impossible.)",
  }
}

// ── 5. Did any audit entry get lost? ─────────────────────────────

async function checkWriteFailures(): Promise<IntegrityCheck> {
  const since30 = new Date(Date.now() - 30 * 86_400_000)
  const since24 = new Date(Date.now() - 86_400_000)
  const [total, recent, sample] = await Promise.all([
    prisma.auditWriteFailure.count({ where: { createdAt: { gte: since30 } } }),
    prisma.auditWriteFailure.count({ where: { createdAt: { gte: since24 } } }),
    prisma.auditWriteFailure.findMany({ where: { createdAt: { gte: since30 } }, orderBy: { createdAt: "desc" }, take: 5 }),
  ])
  if (total === 0) {
    return {
      id: "audit-write-failures", title: "No audit entry has been lost", status: "pass",
      summary: "Every attempted audit write in the last 30 days was recorded.", detail: [],
    }
  }
  return {
    id: "audit-write-failures", title: "No audit entry has been lost", status: recent > 0 ? "fail" : "warn",
    summary: `${total} audit entr${total === 1 ? "y" : "ies"} could not be written in the last 30 days (${recent} in the last 24 h).`,
    detail: sample.map((f) => `${f.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC · ${f.module}/${f.action} · ${f.error.slice(0, 120)}`),
    remedy: "Find the cause in the server log (database connectivity, permissions or a bad user reference). Actions on bookings, payments and installments are rolled back when their audit entry cannot be written, so nothing there is unrecorded; other entries may be missing.",
  }
}

export async function getIntegrityReport(): Promise<IntegrityReport> {
  const [chain, immutable, index, violations, failures] = await Promise.all([
    checkAuditChain(), checkAuditImmutable(), checkDateIndex(), checkRuleViolations(), checkWriteFailures(),
  ])
  const checks = [chain, immutable.check, index, violations, failures]
  return {
    generatedAt: new Date().toISOString(),
    overall: worst(checks.map((c) => c.status)),
    database: { role: immutable.role, usingRuntimeUrl: !!process.env.RUNTIME_DATABASE_URL },
    checks,
  }
}
