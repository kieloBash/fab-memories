// app/api/bookings/[bookingId]/vendors/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { assignVendorSchema } from "@/features/vendors/vendors.schema"
import {
  assignVendorToBooking,
  getBookingVendors,
  getVendorCoverageForBooking,
  getVendorDateConflicts,
} from "@/features/vendors/vendors.query"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ bookingId: string }> }

/**
 * GET /api/bookings/[bookingId]/vendors
 * Returns all vendors assigned to this booking.
 * Also accepts ?coverage=true to return the coverage check instead.
 */
export async function GET(req: Request, { params }: Params) {
  try { await requireRole(["ADMIN", "COORDINATOR", "VENDOR", "CLIENT"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId } = await params
  const { searchParams } = new URL(req.url)

  // Client: only own bookings
  if (actor.role === "CLIENT") {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }, select: { clientId: true },
    })
    if (!booking || booking.clientId !== actor.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (searchParams.get("coverage") === "true") {
    const coverage = await getVendorCoverageForBooking(bookingId)
    return NextResponse.json(coverage)
  }

  const vendors = await getBookingVendors(bookingId)
  return NextResponse.json(vendors)
}

/**
 * POST /api/bookings/[bookingId]/vendors
 * Admin assigns a vendor to a booking.
 */
export async function POST(req: Request, { params }: Params) {
  try { await requireRole(["ADMIN", "COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId } = await params
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId }, select: { id: true, eventDate: true },
  })
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

  const body   = await req.json().catch(() => ({}))
  const parsed = assignVendorSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )

  // Check if already assigned
  const existing = await prisma.bookingVendor.findUnique({
    where: { bookingId_vendorId: { bookingId, vendorId: parsed.data.vendorId } },
  })
  if (existing)
    return NextResponse.json(
      { error: "This vendor is already assigned to this booking" },
      { status: 409 },
    )

  const assignment = await assignVendorToBooking(bookingId, parsed.data)

  // Availability conflict info (non-blocking — just logged)
  const conflicts = await getVendorDateConflicts(
    parsed.data.vendorId,
    booking.eventDate.toISOString(),
    bookingId,
  )

  await logAction({
    userId:      actor.id,
    action:      "CREATE",
    module:      "VENDOR",
    description: `${actor.role} "${actor.fullName}" assigned vendor to booking ${bookingId}`,
    metadata:    { bookingId, vendorId: parsed.data.vendorId, conflicts },
  })

  return NextResponse.json({ ...assignment, conflicts }, { status: 201 })
}
