// app/api/staff/my-schedule/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { getMyAssignments } from "@/features/staff-assignments/staff-assignments.query"
import { NextResponse } from "next/server"

/**
 * GET /api/staff/my-schedule
 * Returns the signed-in coordinator's own assignments — self-scoped,
 * no bookingId or coordinatorId param needed. COORDINATOR only
 * (an ADMIN viewing "their own" schedule doesn't make sense here;
 * admins use the full roster + per-booking panel instead).
 */
export async function GET() {
  try { await requireRole(["COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const assignments = await getMyAssignments(actor.id)
  return NextResponse.json(assignments)
}
