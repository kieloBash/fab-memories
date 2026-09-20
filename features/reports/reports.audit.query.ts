// features/reports/reports.audit.query.ts
//
// FR-56 — Audit trail monitoring report (ADMIN only). Filter dates apply to
// the log timestamp, bucketed by MANILA calendar day (the existing audit
// list filters by UTC day; here "from 2026-09-19" means Manila 2026-09-19).

import { Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { manilaDayEndUtc, manilaDayStartUtc } from "./reports.dates"
import type { ReportFilterInput } from "./reports.schema"
import { buildMeta, getChainIntegrity, pagingArgs, type Paging } from "./reports.shared"
import type { AuditReport, AuditReportRow } from "./reports.types"

const TOP_USERS = 10

export async function getAuditReport(
  filters: ReportFilterInput,
  paging: Paging,
): Promise<AuditReport> {
  const t0 = performance.now()

  const where: Prisma.AuditLogWhereInput = {
    userId: filters.userId,
    module: filters.module,
    action: filters.action,
    status: filters.status,
    description: filters.search
      ? { contains: filters.search, mode: "insensitive" }
      : undefined,
    createdAt:
      filters.from || filters.to
        ? {
            gte: filters.from ? manilaDayStartUtc(filters.from) : undefined,
            lte: filters.to   ? manilaDayEndUtc(filters.to)     : undefined,
          }
        : undefined,
  }

  const [
    totalEntries,
    failureCount,
    byModuleRaw,
    byActionRaw,
    byUserRaw,
    byDayRaw,
    pageRows,
    chain,
  ] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { ...where, status: "FAILURE" } }),
    prisma.auditLog.groupBy({ by: ["module"], where, _count: { _all: true } }),
    prisma.auditLog.groupBy({ by: ["action"], where, _count: { _all: true } }),
    prisma.auditLog.groupBy({ by: ["userId"], where, _count: { _all: true } }),
    queryByDay(filters),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { fullName: true, role: true } } },
      orderBy: { sequence: "desc" },
      ...pagingArgs(paging),
    }),
    getChainIntegrity(true),
  ])

  // ── Top users (names resolved in one extra query) ───────────────
  const perUser = byUserRaw
    .filter((r): r is typeof r & { userId: string } => r.userId !== null)
    .map((r) => ({ userId: r.userId, count: r._count._all }))
    .sort((a, b) => b.count - a.count)

  const topIds = perUser.slice(0, TOP_USERS).map((u) => u.userId)
  const users = topIds.length
    ? await prisma.user.findMany({ where: { id: { in: topIds } }, select: { id: true, fullName: true } })
    : []
  const nameById = new Map(users.map((u) => [u.id, u.fullName]))

  const rows: AuditReportRow[] = pageRows.map((r) => ({
    id:           r.id,
    sequence:     r.sequence,
    createdAt:    r.createdAt.toISOString(),
    userName:     r.user?.fullName ?? null,
    userRole:     r.user?.role ?? null,
    action:       r.action,
    module:       r.module,
    description:  r.description,
    status:       r.status,
    hash:         r.hash,
    previousHash: r.previousHash,
  }))

  return {
    meta: buildMeta(filters, paging, totalEntries, t0),
    summary: {
      totalEntries,
      failureCount,
      uniqueUsers: perUser.length,
      byModule: byModuleRaw
        .map((r) => ({ module: r.module, count: r._count._all }))
        .sort((a, b) => b.count - a.count),
      byAction: byActionRaw
        .map((r) => ({ action: r.action, count: r._count._all }))
        .sort((a, b) => b.count - a.count),
      topUsers: perUser.slice(0, TOP_USERS).map((u) => ({
        userId: u.userId,
        name:   nameById.get(u.userId) ?? "Unknown user",
        count:  u.count,
      })),
      byDay: byDayRaw,
    },
    chain,
    rows,
  }
}

/**
 * Entries per Manila calendar day. Raw SQL because Prisma can't group by a
 * timezone-shifted date. Every condition mirrors the Prisma `where` above.
 */
async function queryByDay(filters: ReportFilterInput): Promise<{ date: string; count: number }[]> {
  const localDate = Prisma.sql`(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Manila')`
  const conds: Prisma.Sql[] = []

  if (filters.from)   conds.push(Prisma.sql`${localDate}::date >= ${filters.from}::date`)
  if (filters.to)     conds.push(Prisma.sql`${localDate}::date <= ${filters.to}::date`)
  if (filters.userId) conds.push(Prisma.sql`"userId" = ${filters.userId}`)
  if (filters.module) conds.push(Prisma.sql`"module" = ${filters.module}::"AuditModule"`)
  if (filters.action) conds.push(Prisma.sql`"action" = ${filters.action}::"AuditAction"`)
  if (filters.status) conds.push(Prisma.sql`"status" = ${filters.status}::"AuditStatus"`)
  if (filters.search) {
    const like = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`
    conds.push(Prisma.sql`"description" ILIKE ${like} ESCAPE '\\'`)
  }

  const whereSql = conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, " AND ")}` : Prisma.empty

  const rows = await prisma.$queryRaw<{ day: string; count: number }[]>`
    SELECT to_char(${localDate}, 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
    FROM "AuditLog"
    ${whereSql}
    GROUP BY 1
    ORDER BY 1 ASC
  `
  return rows.map((r) => ({ date: r.day, count: r.count }))
}
