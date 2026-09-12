// app/api/reports/dashboard/route.ts

import { requireRole } from "@/lib/clerk/auth"
import { getAdminDashboardSummary } from "@/features/reports/reports.query"
import { NextResponse } from "next/server"

/**
 * GET /api/reports/dashboard
 * Real-time operational dashboard metrics (FR-58) — active bookings,
 * pending requests, payments to verify, upcoming events this week,
 * staffing compliance gaps, and vendor coverage gaps, plus a merged
 * "needs attention" list. ADMIN only, per spec.
 */
export async function GET() {
  try { await requireRole(["ADMIN"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const summary = await getAdminDashboardSummary()
  return NextResponse.json(summary)
}
