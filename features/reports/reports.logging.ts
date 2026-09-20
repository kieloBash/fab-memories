// features/reports/reports.logging.ts
//
// Audit logging for report access (FR-48: "report accesses" must be logged).
//
// VIEW entries are de-duplicated: an identical description (same user, same
// report, same filters) is written at most once per VIEW_LOG_DEDUP_MINUTES.
// This keeps the dashboard's auto-refresh and table pagination from flooding
// the hash-chained audit trail with identical rows, while every DISTINCT
// access (new report, new filters, a later session) is still recorded.
//
// EXPORT entries are never de-duplicated — every download is recorded.

import { logAction } from "@/lib/audit/log"
import { prisma } from "@/lib/prisma"
import { VIEW_LOG_DEDUP_MINUTES } from "./reports.constants"

export async function logReportView(params: {
  userId:      string
  description: string
  metadata?:   Record<string, unknown>
}): Promise<void> {
  try {
    const since = new Date(Date.now() - VIEW_LOG_DEDUP_MINUTES * 60_000)
    const recent = await prisma.auditLog.findFirst({
      where: {
        userId:      params.userId,
        action:      "VIEW",
        module:      "REPORT",
        description: params.description,
        createdAt:   { gte: since },
      },
      select: { id: true },
    })
    if (recent) return
  } catch {
    // If the de-dup lookup fails, fall through and log anyway — never lose an access record.
  }

  await logAction({
    userId:      params.userId,
    action:      "VIEW",
    module:      "REPORT",
    description: params.description,
    metadata:    params.metadata,
  })
}

export async function logReportExport(params: {
  userId:      string
  description: string
  metadata?:   Record<string, unknown>
}): Promise<void> {
  await logAction({
    userId:      params.userId,
    action:      "EXPORT",
    module:      "REPORT",
    description: params.description,
    metadata:    params.metadata,
  })
}

export async function logReportFailure(params: {
  userId:      string
  description: string
  metadata?:   Record<string, unknown>
}): Promise<void> {
  await logAction({
    userId:      params.userId,
    action:      "VIEW",
    module:      "REPORT",
    description: params.description,
    status:      "FAILURE",
    metadata:    params.metadata,
  })
}
