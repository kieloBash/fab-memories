// app/api/staff/my-dashboard/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { getCoordinatorDashboardSummary } from "@/features/staff-assignments/staff-assignments.query"
import { NextResponse } from "next/server"

/**
 * GET /api/staff/my-dashboard
 * Self-scoped dashboard summary for the signed-in coordinator — stat
 * counts (upcoming, this week, understaffed) plus a short upcoming list.
 * COORDINATOR only, same as /api/staff/my-schedule.
 */
export async function GET() {
  try { await requireRole(["COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const summary = await getCoordinatorDashboardSummary(actor.id)
  return NextResponse.json(summary)
}
