// app/api/bookings/[bookingId]/staff/[assignmentId]/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { updateStaffAssignmentSchema } from "@/features/staff-assignments/staff-assignments.schema"
import {
  deleteStaffAssignmentRecord,
  updateStaffAssignmentRecord,
} from "@/features/staff-assignments/staff-assignments.query"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ bookingId: string; assignmentId: string }> }

/**
 * PATCH /api/bookings/[bookingId]/staff/[assignmentId]
 * Update a coordinator's task role, backup designation, or notes.
 */
export async function PATCH(req: Request, { params }: Params) {
  try { await requireRole(["ADMIN", "COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId, assignmentId } = await params
  const body   = await req.json().catch(() => ({}))
  const parsed = updateStaffAssignmentSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )

  const updated = await updateStaffAssignmentRecord(assignmentId, parsed.data)

  await logAction({
    userId:      actor.id,
    action:      "UPDATE",
    module:      "STAFF_SCHEDULE",
    description: `${actor.role} "${actor.fullName}" updated staff assignment for booking ${bookingId}`,
    metadata:    { bookingId, assignmentId, changes: parsed.data },
  })

  return NextResponse.json(updated)
}

/**
 * DELETE /api/bookings/[bookingId]/staff/[assignmentId]
 * Removes a coordinator from a booking.
 */
export async function DELETE(_req: Request, { params }: Params) {
  try { await requireRole(["ADMIN", "COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId, assignmentId } = await params
  await deleteStaffAssignmentRecord(assignmentId)

  await logAction({
    userId:      actor.id,
    action:      "DELETE",
    module:      "STAFF_SCHEDULE",
    description: `${actor.role} "${actor.fullName}" removed a coordinator from booking ${bookingId}`,
    metadata:    { bookingId, assignmentId },
  })

  return NextResponse.json({ success: true })
}
