// app/api/bookings/[bookingId]/staff/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { assignStaffSchema } from "@/features/staff-assignments/staff-assignments.schema"
import {
  checkCoordinatorConflict,
  createStaffAssignment,
  getStaffAssignmentsByBooking,
  getStaffingComplianceForBooking,
} from "@/features/staff-assignments/staff-assignments.query"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ bookingId: string }> }

/**
 * GET /api/bookings/[bookingId]/staff
 * Returns all coordinators assigned to this booking.
 *   ?compliance=true                     → returns FR-37 staffing compliance instead
 *   ?conflict=true&coordinatorId=xxx     → returns FR-40 conflict check for that coordinator
 * (Same query-param pattern as /api/bookings/[bookingId]/vendors?coverage=true.)
 */
export async function GET(req: Request, { params }: Params) {
  try { await requireRole(["ADMIN", "COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const { bookingId } = await params
  const { searchParams } = new URL(req.url)

  if (searchParams.get("compliance") === "true") {
    const compliance = await getStaffingComplianceForBooking(bookingId)
    if (!compliance) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    return NextResponse.json(compliance)
  }

  if (searchParams.get("conflict") === "true") {
    const coordinatorId = searchParams.get("coordinatorId")
    if (!coordinatorId)
      return NextResponse.json({ error: "coordinatorId is required" }, { status: 422 })

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }, select: { eventDate: true },
    })
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

    const conflict = await checkCoordinatorConflict(
      coordinatorId,
      booking.eventDate.toISOString(),
      bookingId,
    )
    return NextResponse.json(conflict)
  }

  const assignments = await getStaffAssignmentsByBooking(bookingId)
  return NextResponse.json(assignments)
}

/**
 * POST /api/bookings/[bookingId]/staff
 * Assigns a coordinator to a booking with a designated task role (FR-38).
 * Conflict detection (FR-40) runs and is included in the response —
 * informational only, never blocks the assignment.
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
  const parsed = assignStaffSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )

  // Confirm the target user is actually a COORDINATOR
  const coordinator = await prisma.user.findUnique({
    where: { id: parsed.data.coordinatorId },
    select: { role: true, isActive: true },
  })
  if (!coordinator || coordinator.role !== "COORDINATOR")
    return NextResponse.json({ error: "Selected user is not a coordinator" }, { status: 422 })

  // Already assigned to this booking?
  const existing = await prisma.staffAssignment.findUnique({
    where: {
      bookingId_coordinatorId: { bookingId, coordinatorId: parsed.data.coordinatorId },
    },
  })
  if (existing)
    return NextResponse.json(
      { error: "This coordinator is already assigned to this booking" },
      { status: 409 },
    )

  const assignment = await createStaffAssignment(bookingId, parsed.data)

  // FR-40 — non-blocking conflict check, logged for audit visibility
  const conflict = await checkCoordinatorConflict(
    parsed.data.coordinatorId,
    booking.eventDate.toISOString(),
    bookingId,
  )

  await logAction({
    userId:      actor.id,
    action:      "CREATE",
    module:      "STAFF_SCHEDULE",
    description: `${actor.role} "${actor.fullName}" assigned coordinator to booking ${bookingId} (${parsed.data.taskRole}${parsed.data.isBackup ? ", backup" : ""})`,
    metadata:    {
      bookingId,
      coordinatorId: parsed.data.coordinatorId,
      taskRole: parsed.data.taskRole,
      isBackup: parsed.data.isBackup ?? false,
      hasConflict: conflict.hasConflict,
    },
  })

  return NextResponse.json({ ...assignment, conflict }, { status: 201 })
}
