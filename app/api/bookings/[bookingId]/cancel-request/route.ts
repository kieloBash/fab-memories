// app/api/bookings/[bookingId]/cancel-request/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { cancelRequestSchema } from "@/features/bookings/bookings.schema"
import {
  getBookingById,
  requestCancellationRecord,
} from "@/features/bookings/bookings.query"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ bookingId: string }> }

/**
 * POST /api/bookings/[bookingId]/cancel-request
 * Client requests cancellation of a CONFIRMED booking.
 * This does NOT cancel the booking — it sets status to CANCELLATION_REQUESTED
 * and stores the reason. Staff reviews and either approves (CANCELLED)
 * or declines (back to CONFIRMED) via the admin booking detail.
 */
export async function POST(req: Request, { params }: Params) {
  try { await requireRole(["CLIENT"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId } = await params
  const existing = await getBookingById(bookingId)

  if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  if (existing.clientId !== actor.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (!["CONFIRMED", "CANCELLATION_REQUESTED"].includes(existing.status))
    return NextResponse.json(
      { error: "You can only request cancellation for a confirmed booking" },
      { status: 409 },
    )

  const body = await req.json().catch(() => ({}))
  const parsed = cancelRequestSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )

  const updated = await requestCancellationRecord(bookingId, parsed.data.reason)

  await logAction({
    userId:      actor.id,
    action:      "UPDATE",
    module:      "BOOKING",
    description: `Client "${actor.fullName}" requested cancellation of booking`,
    metadata:    { bookingId, reason: parsed.data.reason },
  })

  return NextResponse.json(updated)
}
