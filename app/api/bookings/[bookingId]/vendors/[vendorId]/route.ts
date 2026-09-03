// app/api/bookings/[bookingId]/vendors/[vendorId]/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { updateBookingVendorSchema } from "@/features/vendors/vendors.schema"
import {
  removeVendorFromBooking,
  updateBookingVendorRecord,
} from "@/features/vendors/vendors.query"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ bookingId: string; vendorId: string }> }

/**
 * PATCH /api/bookings/[bookingId]/vendors/[vendorId]
 * Update vendor assignment status (contacted, confirmed, notes).
 */
export async function PATCH(req: Request, { params }: Params) {
  try { await requireRole(["ADMIN", "COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId, vendorId } = await params
  const body   = await req.json().catch(() => ({}))
  const parsed = updateBookingVendorSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )

  const updated = await updateBookingVendorRecord(bookingId, vendorId, parsed.data)
  await logAction({
    userId:      actor.id,
    action:      "UPDATE",
    module:      "VENDOR",
    description: `${actor.role} "${actor.fullName}" updated vendor assignment for booking ${bookingId}`,
    metadata:    { bookingId, vendorId, changes: parsed.data },
  })

  return NextResponse.json(updated)
}

/**
 * DELETE /api/bookings/[bookingId]/vendors/[vendorId]
 * Remove a vendor from a booking.
 */
export async function DELETE(_req: Request, { params }: Params) {
  try { await requireRole(["ADMIN", "COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId, vendorId } = await params
  await removeVendorFromBooking(bookingId, vendorId)

  await logAction({
    userId:      actor.id,
    action:      "DELETE",
    module:      "VENDOR",
    description: `${actor.role} "${actor.fullName}" removed vendor from booking ${bookingId}`,
    metadata:    { bookingId, vendorId },
  })

  return NextResponse.json({ success: true })
}
