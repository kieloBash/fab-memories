// app/api/reports/dashboard/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { getAdminDashboardSummary } from "@/features/reports/reports.query"
import { NextResponse } from "next/server"

/**
 * GET /api/reports/dashboard
 * Real-time operational dashboard metrics (FR-58) — active bookings,
 * pending requests, payments to verify, upcoming events this week,
 * staffing compliance gaps, and vendor coverage gaps, plus a merged
 * "needs attention" list. ADMIN only, per spec.
 *
 * UPDATED — now logs a VIEW/REPORT audit entry on each load. FR-48
 * explicitly requires "report accesses" to be logged; the REPORT
 * module value existed in the schema from the start but nothing had
 * ever written to it until this change (and /api/audit, added
 * alongside this).
 */
export async function GET() {
  try { await requireRole(["ADMIN"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const summary = await getAdminDashboardSummary()

  const actor = await getCurrentDbUser()
  await logAction({
    userId: actor?.id ?? null,
    action: "VIEW",
    module: "REPORT",
    description: `${actor?.fullName ?? "Admin"} viewed the operational dashboard`,
  })

  return NextResponse.json(summary)
}
