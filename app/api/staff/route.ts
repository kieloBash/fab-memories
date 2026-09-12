// app/api/staff/route.ts

import { requireRole } from "@/lib/clerk/auth"
import { getCoordinatorRoster } from "@/features/staff-assignments/staff-assignments.query"
import { NextResponse } from "next/server"

/**
 * GET /api/staff
 * Returns the coordinator roster with upcoming assignment counts (FR-36).
 * ADMIN + COORDINATOR only.
 */
export async function GET() {
  try { await requireRole(["ADMIN", "COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const roster = await getCoordinatorRoster()
  return NextResponse.json(roster)
}
