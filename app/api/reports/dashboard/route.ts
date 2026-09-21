// app/api/reports/dashboard/route.ts

import { getAdminDashboardSummary } from "@/features/reports/reports.query"
import { logReportView } from "@/features/reports/reports.logging"
import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { NextResponse } from "next/server"

/**
 * GET /api/reports/dashboard
 * Real-time operational dashboard (FR-58): active bookings, pending
 * requests, payments to verify, upcoming events, staffing/vendor gaps,
 * recent audit activity, and rule-based risk indicators. ADMIN only.
 *
 * MODULE 8 CHANGE — access logging is now de-duplicated. The dashboard
 * polls every 30 s; previously every poll wrote a VIEW audit entry
 * (~2,900 per open tab per day), burying real activity in the audit trail.
 * The access is still logged (FR-48) — once per user per 10 minutes.
 */
export async function GET() {
  try { await requireRole(["ADMIN"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()

  const summary = await getAdminDashboardSummary()

  if (actor) {
    await logReportView({
      userId: actor.id,
      description: `${actor.role} viewed the operational dashboard`,
    })
  }

  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } })
}
