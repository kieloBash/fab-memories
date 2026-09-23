// app/api/staff/availability/route.ts
//
// GET/POST — a COORDINATOR's own unavailable days (B-04). Everyone else uses this only indirectly, through the
// staff-assignment gate (see the unavailability check wired into POST /api/bookings/[id]/staff).

import { addUnavailableDaySchema } from "@/features/availability/availability.schema"
import { addUnavailableDay, getUnavailableDays } from "@/features/availability/availability.query"
import { logAction } from "@/lib/audit/log"
import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try { await requireRole(["COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  return NextResponse.json(await getUnavailableDays(actor.id))
}

export async function POST(req: Request) {
  try { await requireRole(["COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = addUnavailableDaySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 })

  const day = await addUnavailableDay(actor.id, parsed.data)

  await logAction({
    userId: actor.id, action: "CREATE", module: "STAFF_SCHEDULE",
    description: "Coordinator marked a day unavailable",
    metadata: { date: day.date, conflictsWithAssignment: day.conflictsWithAssignment },
  })

  return NextResponse.json(day, { status: 201 })
}
