// app/api/bookings/[bookingId]/history/route.ts

import { getBookingHistory } from "@/features/bookings/booking-history.query"
import { getBookingById } from "@/features/bookings/bookings.query"
import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ bookingId: string }> }

/** GET /api/bookings/[bookingId]/history — the booking's status timeline. ADMIN/COORDINATOR: any booking. CLIENT: only their own. */
export async function GET(_req: Request, { params }: Params) {
  let role: string
  try { role = await requireRole(["ADMIN", "COORDINATOR", "CLIENT"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId } = await params
  const booking = await getBookingById(bookingId)
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  if (role === "CLIENT" && booking.clientId !== actor.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  return NextResponse.json(await getBookingHistory(bookingId))
}
