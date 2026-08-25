// app/api/bookings/availability/route.ts

import { requireRole } from "@/lib/clerk/auth"
import { isDateAvailable } from "@/features/bookings/bookings.query"
import { NextResponse } from "next/server"

/**
 * GET /api/bookings/availability?date=YYYY-MM-DD
 * Returns whether the given date has no confirmed booking.
 * Business rule: one confirmed event per calendar day.
 * Accessible by all authenticated roles.
 */
export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN", "COORDINATOR", "VENDOR", "CLIENT"])
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")

  if (!date || isNaN(Date.parse(date))) {
    return NextResponse.json(
      { error: "Query param ?date=YYYY-MM-DD is required and must be a valid date" },
      { status: 400 },
    )
  }

  const available = await isDateAvailable(date)

  return NextResponse.json({ date, available })
}
