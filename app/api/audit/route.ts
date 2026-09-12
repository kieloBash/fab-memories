// app/api/audit/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { auditFilterSchema } from "@/features/audit/audit.schema"
import { getAuditLogs, getAuditFilterOptions } from "@/features/audit/audit.query"
import { NextResponse } from "next/server"

/**
 * GET /api/audit
 * FR-50 — searchable, filterable audit trail. ADMIN only (per spec —
 * unlike Module 8's operational reports, this one is not extended to
 * Coordinator).
 *
 * ?options=true returns the filter dropdown data (distinct users)
 * instead of log entries — same consolidated-route pattern already
 * used elsewhere (vendors' ?coverage=true, staff's ?compliance=true).
 *
 * FR-48 explicitly lists "report accesses" among the actions that must
 * be logged — viewing the audit trail itself is logged here (but not
 * for ?options= calls, which are just dropdown metadata, to avoid
 * doubling every real page load into two log entries).
 */
export async function GET(req: Request) {
  try { await requireRole(["ADMIN"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const { searchParams } = new URL(req.url)

  if (searchParams.get("options") === "true") {
    const options = await getAuditFilterOptions()
    return NextResponse.json(options)
  }

  const parsed = auditFilterSchema.safeParse({
    from:     searchParams.get("from") ?? undefined,
    to:       searchParams.get("to") ?? undefined,
    userId:   searchParams.get("userId") ?? undefined,
    module:   searchParams.get("module") ?? undefined,
    action:   searchParams.get("action") ?? undefined,
    status:   searchParams.get("status") ?? undefined,
    search:   searchParams.get("search") ?? undefined,
    page:     searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid filters" },
      { status: 422 },
    )
  }

  const result = await getAuditLogs(parsed.data)

  const actor = await getCurrentDbUser()
  await logAction({
    userId: actor?.id ?? null,
    action: "VIEW",
    module: "REPORT",
    description: `${actor?.fullName ?? "Admin"} viewed the audit trail`,
    metadata: { filters: parsed.data },
  })

  return NextResponse.json(result)
}
