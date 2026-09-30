// app/api/bookings/[bookingId]/vendors/[vendorId]/route.ts

import { auditChanges } from "@/lib/audit/redact"
import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { updateBookingVendorSchema } from "@/features/vendors/vendors.schema"
import {
  removeVendorFromBooking,
  updateBookingVendorRecord,
} from "@/features/vendors/vendors.query"
import { prisma } from "@/lib/prisma"
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

  // 404 (not 500) when this vendor is not assigned to this booking.
  if (!(await assignmentExists(bookingId, vendorId)))
    return NextResponse.json({ error: "This vendor is not assigned to this booking" }, { status: 404 })

  const updated = await updateBookingVendorRecord(bookingId, vendorId, parsed.data)
  await logAction({
    userId:      actor.id,
    action:      "UPDATE",
    module:      "VENDOR",
    description: `${actor.role} updated vendor assignment for booking ${bookingId}`,
    metadata:    { bookingId, vendorId, changes: auditChanges(parsed.data) },
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
  if (!(await assignmentExists(bookingId, vendorId)))
    return NextResponse.json({ error: "This vendor is not assigned to this booking" }, { status: 404 })
  await removeVendorFromBooking(bookingId, vendorId)

  await logAction({
    userId:      actor.id,
    action:      "DELETE",
    module:      "VENDOR",
    description: `${actor.role} removed vendor from booking ${bookingId}`,
    metadata:    { bookingId, vendorId },
  })

  return NextResponse.json({ success: true })
}

async function assignmentExists(bookingId: string, vendorId: string) {
  const row = await prisma.bookingVendor.findUnique({
    where: { bookingId_vendorId: { bookingId, vendorId } },
    select: { id: true },
  })
  return !!row
}
