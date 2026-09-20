// features/reports/reports.shared.ts
//
// Server-only helpers shared by the report queries.
// NOTE: intentionally NOT a "use server" module — that directive would turn
// every export into a callable server action with no auth check.

import { verifyAuditChainIntegrity } from "@/features/audit/audit.query"
import type { ChainIntegrityResult } from "@/features/audit/audit.types"
import { EXPORT_ROW_LIMIT, RISK_THRESHOLDS } from "./reports.constants"
import type { ReportFilterInput } from "./reports.schema"
import type { ReportMeta } from "./reports.types"

// ── Paging ───────────────────────────────────────────────────────

export type Paging =
  | { mode: "page"; page: number; pageSize: number }
  | { mode: "all" }

export function pagingArgs(paging: Paging): { skip: number; take: number } {
  return paging.mode === "all"
    ? { skip: 0, take: EXPORT_ROW_LIMIT }
    : { skip: (paging.page - 1) * paging.pageSize, take: paging.pageSize }
}

/** Slices an in-memory array the same way `pagingArgs` slices a DB query. */
export function pageSlice<T>(items: T[], paging: Paging): T[] {
  const { skip, take } = pagingArgs(paging)
  return items.slice(skip, skip + take)
}

export function buildMeta(
  filters: ReportFilterInput,
  paging: Paging,
  totalRows: number,
  startedAt: number,
): ReportMeta {
  const pageSize = paging.mode === "all" ? Math.max(totalRows, 1) : paging.pageSize
  return {
    generatedAt: new Date().toISOString(),
    durationMs:  Math.round(performance.now() - startedAt),
    filters,
    page:        paging.mode === "all" ? 1 : paging.page,
    pageSize,
    totalRows,
    totalPages:  Math.max(1, Math.ceil(totalRows / pageSize)),
    truncated:   paging.mode === "all" && totalRows > EXPORT_ROW_LIMIT,
  }
}

// ── Number helpers ───────────────────────────────────────────────

/** Prisma Decimal | number | null → number (0 for null). */
export function num(value: { toString(): string } | number | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value)
}

/** Like `num` but preserves null. */
export function numOrNull(value: { toString(): string } | number | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function peso(n: number): string {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

// ── Filter description (used in audit log text) ──────────────────

/** "from 2026-09-01, to 2026-09-30, bookingStatus CONFIRMED" — excludes paging/empty values. */
export function describeFilters(filters: ReportFilterInput): string {
  const parts = Object.entries(filters)
    .filter(([key, v]) => v !== undefined && v !== "" && key !== "page" && key !== "pageSize")
    .map(([key, v]) => `${key} ${String(v)}`)
  return parts.length ? parts.join(", ") : "no filters"
}

// ── Audit-chain check with a TTL cache ───────────────────────────
//
// verifyAuditChainIntegrity() walks the whole chain (O(n)). The audit
// report calls it fresh every time; the dashboard's risk engine polls
// often, so it reuses a cached result for CHAIN_CHECK_TTL_MS.

let chainCache: { at: number; result: ChainIntegrityResult } | null = null

export async function getChainIntegrity(force = false): Promise<ChainIntegrityResult> {
  const now = Date.now()
  if (!force && chainCache && now - chainCache.at < RISK_THRESHOLDS.CHAIN_CHECK_TTL_MS) {
    return chainCache.result
  }
  const result = await verifyAuditChainIntegrity()
  chainCache = { at: now, result }
  return result
}
