// app/api/bookings/[bookingId]/route.ts

import {
  cancelBookingRecord,
  confirmBookingRecord,
  deleteBookingRecord,
  getBookingById,
  isDateAvailable,
  updateBookingRecord,
} from "@/features/bookings/bookings.query"
import {
  updateBookingSchema,
  updateBookingStatusSchema,
} from "@/features/bookings/bookings.schema"
import { auditedTransaction, logAction } from "@/lib/audit/log"
import { attempt } from "@/lib/route-errors"
import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ bookingId: string }> }

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

  // ── CLIENT: edit PENDING booking ─────────────────────────
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

    // FIX: this compared two Date OBJECTS with !==, which is always true (different references).
    // Compare the calendar dates instead, so the availability check runs only when the date really changes.
    const currentYmd = new Date(existing.eventDate).toISOString().slice(0, 10)
    if (parsed.data.eventDate && parsed.data.eventDate.slice(0, 10) !== currentYmd) {
      const available = await isDateAvailable(parsed.data.eventDate, bookingId)
      if (!available)
        return NextResponse.json(
          { error: "This date is already booked. Please choose a different date." },
          { status: 409 },
        )
    }

    const r_updated = await attempt(
    auditedTransaction(async (tx, audit) => {
      const result = await updateBookingRecord(
      bookingId,
      parsed.data,
      existing.packageId,
      existing.isProvincial,
      Number(existing.agreedPrice), tx)
      audit({
            userId: actor.id, action: "UPDATE", module: "BOOKING",
            description: `Client "${actor.fullName}" updated their booking`,
            metadata: { bookingId, changes: parsed.data },
          })
      return result
    }),
    { userId: actor.id, module: "BOOKING", action: "UPDATE", what: "update the booking" },
  )
  if (!r_updated.ok) return r_updated.response
  const updated = r_updated.value

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

  // MODULE 9: every status change goes through the booking gate (bookings.transition.ts) inside ONE
  // transaction together with its audit entry. "Confirm" requires a verified deposit and a free date;
  // "Decline & keep confirmed" is the same transition from CANCELLATION_REQUESTED, recorded as DECLINE.
  const isRestore = parsed.data.status === "CONFIRMED" && existing.status === "CANCELLATION_REQUESTED"
  const r_status = await attempt(
    auditedTransaction(async (tx, audit) => {
      if (parsed.data.status === "CONFIRMED") {
        const result = await confirmBookingRecord(bookingId, actor.id, tx)
        audit(isRestore
          ? {
              userId: actor.id, action: "DECLINE", module: "BOOKING",
              description: `${actor.role} "${actor.fullName}" declined the cancellation request — booking stays confirmed`,
              metadata: { bookingId, clientId: existing.clientId },
            }
          : {
              userId: actor.id, action: "CONFIRM", module: "BOOKING",
              description: `${actor.role} "${actor.fullName}" confirmed booking`,
              metadata: { bookingId, clientId: existing.clientId },
            })
        return result
      }
      const result = await cancelBookingRecord(bookingId, parsed.data.cancellationReason!, tx)
      audit({
        userId: actor.id, action: "DELETE", module: "BOOKING",
        description: `${actor.role} "${actor.fullName}" cancelled booking`,
        metadata: { bookingId, reason: parsed.data.cancellationReason },
      })
      return result
    }),
    {
      userId: actor.id,
      module: "BOOKING",
      action: parsed.data.status === "CONFIRMED" ? (isRestore ? "DECLINE" : "CONFIRM") : "DELETE",
      what: parsed.data.status === "CONFIRMED" ? (isRestore ? "restore the booking" : "confirm the booking") : "cancel the booking",
      metadata: { bookingId },
    },
  )
  if (!r_status.ok) return r_status.response
  const updated = r_status.value

  return NextResponse.json(updated)
}

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
    return NextResponse.json({ error: "You can only withdraw a pending booking" }, { status: 409 })

  const hasPayment = existing.payments?.some((p) =>
    ["SUBMITTED", "VERIFIED"].includes(p.status),
  )
  if (hasPayment)
    return NextResponse.json(
      { error: "Cannot withdraw — a payment has been submitted. Please contact staff to cancel." },
      { status: 409 },
    )

  const r_deleted = await attempt(
    auditedTransaction(async (tx, audit) => {
      const result = await deleteBookingRecord(bookingId, tx)
      audit({
          userId: actor.id, action: "DELETE", module: "BOOKING",
          description: `Client "${actor.fullName}" withdrew their PENDING booking`,
          metadata: { bookingId },
        })
      return result
    }),
    { userId: actor.id, module: "BOOKING", action: "DELETE", what: "withdraw the booking" },
  )
  if (!r_deleted.ok) return r_deleted.response

  return NextResponse.json({ success: true })
}
