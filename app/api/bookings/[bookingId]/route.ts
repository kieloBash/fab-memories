// app/api/bookings/[bookingId]/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import {
  updateBookingSchema,
  updateBookingStatusSchema,
} from "@/features/bookings/bookings.schema"
import {
  cancelBookingRecord,
  confirmBookingRecord,
  deleteBookingRecord,
  getBookingById,
  isDateAvailable,
  updateBookingRecord,
} from "@/features/bookings/bookings.query"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ bookingId: string }> }

/**
 * GET /api/bookings/[bookingId]
 * - ADMIN / COORDINATOR: any booking
 * - CLIENT: own bookings only
 */
export async function GET(_req: Request, { params }: Params) {
  let role: string
  try { role = await requireRole(["ADMIN", "COORDINATOR", "CLIENT"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId } = await params
  const booking = await getBookingById(bookingId)

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  if (role === "CLIENT" && booking.clientId !== actor.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  return NextResponse.json(booking)
}

/**
 * PATCH /api/bookings/[bookingId]
 * Two modes determined by request body:
 *   1. Client edits a PENDING booking (updateBookingSchema)
 *   2. Staff confirms/cancels a booking (updateBookingStatusSchema)
 */
export async function PATCH(req: Request, { params }: Params) {
  let role: string
  try { role = await requireRole(["ADMIN", "COORDINATOR", "CLIENT"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId } = await params
  const existing = await getBookingById(bookingId)
  if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))

  // ── CLIENT: edit their own PENDING booking ────────────────
  if (role === "CLIENT") {
    if (existing.clientId !== actor.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    if (existing.status !== "PENDING")
      return NextResponse.json(
        { error: "You can only edit a booking that is still pending" },
        { status: 409 },
      )

    const parsed = updateBookingSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 422 },
      )

    // Re-check availability if date changed
    if (parsed.data.eventDate && new Date(parsed.data.eventDate) !== new Date(existing.eventDate)) {
      const available = await isDateAvailable(parsed.data.eventDate, bookingId)
      if (!available)
        return NextResponse.json(
          { error: "This date is already booked. Please choose a different date." },
          { status: 409 },
        )
    }

    const updated = await updateBookingRecord(bookingId, parsed.data)
    await logAction({
      userId: actor.id, action: "UPDATE", module: "BOOKING",
      description: `Client "${actor.fullName}" updated their booking`,
      metadata: { bookingId, changes: parsed.data },
    })
    return NextResponse.json(updated)
  }

  // ── STAFF: confirm or cancel ──────────────────────────────
  if (existing.status === "CANCELLED")
    return NextResponse.json(
      { error: "Cannot update a cancelled booking" },
      { status: 409 },
    )

  const parsed = updateBookingStatusSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )

  let updated
  if (parsed.data.status === "CONFIRMED") {
    updated = await confirmBookingRecord(bookingId, actor.id)
    await logAction({
      userId: actor.id, action: "CONFIRM", module: "BOOKING",
      description: `${actor.role} "${actor.fullName}" confirmed booking`,
      metadata: { bookingId, clientId: existing.clientId },
    })
  } else {
    updated = await cancelBookingRecord(bookingId, parsed.data.cancellationReason!)
    await logAction({
      userId: actor.id, action: "DELETE", module: "BOOKING",
      description: `${actor.role} "${actor.fullName}" cancelled booking`,
      metadata: { bookingId, reason: parsed.data.cancellationReason },
    })
  }

  return NextResponse.json(updated)
}

/**
 * DELETE /api/bookings/[bookingId]
 * CLIENT only — withdraws their own PENDING booking with no deposit submitted.
 */
export async function DELETE(_req: Request, { params }: Params) {
  try { await requireRole(["CLIENT"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId } = await params
  const existing = await getBookingById(bookingId)
  if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  if (existing.clientId !== actor.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (existing.status !== "PENDING")
    return NextResponse.json(
      { error: "You can only withdraw a pending booking" },
      { status: 409 },
    )

  // Block if a payment has been submitted — contact staff instead
  const hasPayment = existing.payments?.some((p) =>
    ["SUBMITTED", "VERIFIED"].includes(p.status),
  )
  if (hasPayment)
    return NextResponse.json(
      { error: "Cannot withdraw — a payment has been submitted. Please contact staff to cancel." },
      { status: 409 },
    )

  await deleteBookingRecord(bookingId)
  await logAction({
    userId: actor.id, action: "DELETE", module: "BOOKING",
    description: `Client "${actor.fullName}" withdrew their PENDING booking`,
    metadata: { bookingId },
  })

  return NextResponse.json({ success: true })
}
