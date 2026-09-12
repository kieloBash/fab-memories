// features/audit/audit.query.ts
"use server"

import { prisma } from "@/lib/prisma"
import { computeEntryHash } from "@/lib/audit/chain"
import type { AuditFilterInput } from "./audit.schema"
import type {
  AuditLogPage, AuditFilterOptions, AuditStats, ChainIntegrityResult,
} from "./audit.types"

const DEFAULT_PAGE_SIZE = 25

/**
 * FR-50 — searchable, filterable audit log view. Paginated (never
 * returns the whole table at once, however large it grows).
 */
export async function getAuditLogs(filters: AuditFilterInput): Promise<AuditLogPage> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE

  const where = {
    userId: filters.userId,
    module: filters.module,
    action: filters.action,
    status: filters.status,
    description: filters.search
      ? { contains: filters.search, mode: "insensitive" as const }
      : undefined,
    createdAt: (filters.from || filters.to)
      ? {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined,
        }
      : undefined,
  }

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { fullName: true, role: true } } },
      orderBy: { sequence: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    entries: rows.map((r) => ({
      id:           r.id,
      sequence:     r.sequence,
      userId:       r.userId,
      userName:     r.user?.fullName ?? null,
      userRole:     r.user?.role ?? null,
      action:       r.action,
      module:       r.module,
      description:  r.description,
      status:       r.status,
      metadata:     (r.metadata as Record<string, unknown> | null) ?? null,
      previousHash: r.previousHash,
      hash:         r.hash,
      createdAt:    r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

/** Distinct users for the filter dropdown — small dataset, no pagination needed. */
export async function getAuditFilterOptions(): Promise<AuditFilterOptions> {
  const users = await prisma.user.findMany({
    where: { auditLogs: { some: {} } },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  })
  return { users }
}

export async function getAuditStats(): Promise<AuditStats> {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const [totalEntries, entriesToday, failureCount, moduleGroups] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.auditLog.count({ where: { status: "FAILURE" } }),
    prisma.auditLog.groupBy({
      by: ["module"],
      _count: { module: true },
      orderBy: { _count: { module: "desc" } },
      take: 1,
    }),
  ])

  const top = moduleGroups[0]

  return {
    totalEntries,
    entriesToday,
    failureCount,
    mostActiveModule: top ? { module: top.module, count: top._count.module } : null,
  }
}

/**
 * FR-47/49 — walks the entire hash chain in sequence order, recomputing
 * each entry's hash from its stored fields and confirming it both
 * matches the stored `hash` AND correctly chains to the previous
 * entry's hash. Returns the exact sequence number where the chain
 * first breaks, if any — pinpointing precisely which entry was altered
 * (or which entry's link to its predecessor was severed) rather than
 * just a blanket "something is wrong."
 *
 * O(n) over the full table. For an audit log at thesis/small-business
 * scale (thousands of rows) this completes in well under a second —
 * comfortably inside NFR-05's 10-second report generation budget.
 */
export async function verifyAuditChainIntegrity(): Promise<ChainIntegrityResult> {
  const entries = await prisma.auditLog.findMany({
    orderBy: { sequence: "asc" },
  })

  let expectedPreviousHash: string | null = null

  for (const entry of entries) {
    if (entry.previousHash !== expectedPreviousHash) {
      return {
        isValid: false,
        totalEntries: entries.length,
        brokenAtSequence: entry.sequence,
        reason: "This entry's recorded previous-hash does not match the actual preceding entry's hash — the chain has been broken or reordered.",
        verifiedAt: new Date().toISOString(),
      }
    }

    const recomputed = computeEntryHash({
      sequence:     entry.sequence,
      previousHash: entry.previousHash,
      userId:       entry.userId,
      action:       entry.action,
      module:       entry.module,
      description:  entry.description,
      status:       entry.status,
      metadata:     entry.metadata ?? {},
      createdAt:    entry.createdAt.toISOString(),
    })

    if (recomputed !== entry.hash) {
      return {
        isValid: false,
        totalEntries: entries.length,
        brokenAtSequence: entry.sequence,
        reason: "This entry's stored content does not match its recorded hash — one or more fields were altered after the entry was written.",
        verifiedAt: new Date().toISOString(),
      }
    }

    expectedPreviousHash = entry.hash
  }

  return {
    isValid: true,
    totalEntries: entries.length,
    brokenAtSequence: null,
    reason: null,
    verifiedAt: new Date().toISOString(),
  }
}
