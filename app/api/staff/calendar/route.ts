// app/api/staff/calendar/route.ts

import { requireRole } from "@/lib/clerk/auth"
import { getStaffingCalendarMonth } from "@/features/staff-assignments/staff-assignments.query"
import { NextResponse } from "next/server"

/**
 * GET /api/staff/calendar?year=2026&month=8
 * Returns every CONFIRMED/PENDING booking in the given month with FR-37
 * staffing compliance pre-computed. `month` is 0-indexed (0 = January),
 * matching JS Date conventions on the client. ADMIN + COORDINATOR only.
 */
export async function GET(req: Request) {
  try { await requireRole(["ADMIN", "COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const { searchParams } = new URL(req.url)
  const year  = parseInt(searchParams.get("year") ?? "", 10)
  const month = parseInt(searchParams.get("month") ?? "", 10)

  if (Number.isNaN(year) || Number.isNaN(month) || month < 0 || month > 11) {
    return NextResponse.json({ error: "Invalid year or month" }, { status: 422 })
  }

  const entries = await getStaffingCalendarMonth(year, month)
  return NextResponse.json(entries)
}
