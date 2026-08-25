// app/api/bookings/[bookingId]/route.ts

import {
  cancelBookingRecord,
  confirmBookingRecord,
  getBookingById,
} from "@/features/bookings/bookings.query"
import { updateBookingStatusSchema } from "@/features/bookings/bookings.schema"
import { logAction } from "@/lib/audit/log"
import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ bookingId: string }> }

/**
 * GET /api/bookings/[bookingId]
 * Returns a booking with package, client, and confirmedBy relations.
 * - ADMIN / COORDINATOR: any booking
 * - CLIENT: only their own booking
 */
export async function GET(_req: Request, { params }: Params) {
  let role: string
  try {
    role = await requireRole(["ADMIN", "COORDINATOR", "CLIENT"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId } = await params
  const booking = await getBookingById(bookingId)

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  // Clients can only view their own bookings
  if (role === "CLIENT" && booking.clientId !== actor.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json(booking)
}

/**
 * PATCH /api/bookings/[bookingId]
 * Confirms or cancels a booking.
 * - ADMIN / COORDINATOR only.
 * - Cannot act on an already-cancelled booking.
 * - Writes BOOKING_CONFIRMED or BOOKING_CANCELLED audit log.
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireRole(["ADMIN", "COORDINATOR"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId } = await params
  const existing = await getBookingById(bookingId)

  if (!existing) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  if (existing.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Cannot update a cancelled booking" },
      { status: 409 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = updateBookingStatusSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )
  }

  let updated
  if (parsed.data.status === "CONFIRMED") {
    updated = await confirmBookingRecord(bookingId, actor.id)

    await logAction({
      userId: actor.id,
      action: "CONFIRM",
      module: "BOOKING",
      description: `${actor.role} "${actor.fullName}" confirmed booking for ${new Date(existing.eventDate).toLocaleDateString()}`,
      metadata: { bookingId, clientId: existing.clientId },
    })
  } else {
    updated = await cancelBookingRecord(bookingId, parsed.data.cancellationReason!)

    await logAction({
      userId: actor.id,
      action: "DELETE",
      module: "BOOKING",
      description: `${actor.role} "${actor.fullName}" cancelled booking for ${new Date(existing.eventDate).toLocaleDateString()}`,
      metadata: {
        bookingId,
        clientId: existing.clientId,
        reason: parsed.data.cancellationReason,
      },
    })
  }

  return NextResponse.json(updated)
}
