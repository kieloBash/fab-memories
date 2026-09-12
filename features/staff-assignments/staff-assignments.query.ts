// features/staff-assignments/staff-assignments.query.ts
"use server"

import { prisma } from "@/lib/prisma"
import { getStaffingRecommendation } from "./staff-assignments.constants"
import type { AssignStaffInput, UpdateStaffAssignmentInput } from "./staff-assignments.schema"

// ── Booking-scoped assignments ──────────────────────────────────

export async function getStaffAssignmentsByBooking(bookingId: string) {
  return prisma.staffAssignment.findMany({
    where: { bookingId },
    include: {
      coordinator: { select: { id: true, fullName: true, username: true, isActive: true } },
    },
    orderBy: [{ isBackup: "asc" }, { assignedAt: "asc" }],
  })
}

export async function getStaffingComplianceForBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { guestCount: true },
  })
  if (!booking) return null

  const assignedCount = await prisma.staffAssignment.count({
    where: { bookingId, isBackup: false },
  })

  const recommendation = getStaffingRecommendation(booking.guestCount)
  const isCompliant = assignedCount >= recommendation.min && assignedCount <= recommendation.max

  return {
    guestCount: booking.guestCount,
    assignedCount,
    recommendation,
    isCompliant,
  }
}

/**
 * FR-40 — Conflict detection (informational, non-blocking). Checks whether
 * this coordinator already has a CONFIRMED or PENDING assignment on the
 * same calendar date via a different booking.
 */
export async function checkCoordinatorConflict(
  coordinatorId: string,
  eventDate: string,
  excludeBookingId?: string,
) {
  const start = new Date(eventDate); start.setUTCHours(0, 0, 0, 0)
  const end = new Date(eventDate); end.setUTCHours(23, 59, 59, 999)

  const conflicting = await prisma.staffAssignment.findMany({
    where: {
      coordinatorId,
      bookingId: excludeBookingId ? { not: excludeBookingId } : undefined,
      booking: {
        eventDate: { gte: start, lte: end },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
    },
    include: {
      booking: { select: { id: true, eventType: true, eventDate: true, venue: true } },
    },
  })

  return {
    hasConflict: conflicting.length > 0,
    conflicts: conflicting.map((c) => ({
      bookingId: c.booking.id,
      eventType: c.booking.eventType,
      eventDate: c.booking.eventDate.toISOString(),
      venue:     c.booking.venue,
    })),
  }
}

export async function createStaffAssignment(bookingId: string, input: AssignStaffInput) {
  return prisma.staffAssignment.create({
    data: {
      bookingId,
      coordinatorId: input.coordinatorId,
      taskRole:      input.taskRole,
      taskNote:      input.taskNote ?? null,
      isBackup:      input.isBackup ?? false,
      notes:         input.notes ?? null,
    },
    include: {
      coordinator: { select: { id: true, fullName: true, username: true, isActive: true } },
    },
  })
}

export async function updateStaffAssignmentRecord(
  assignmentId: string,
  input: UpdateStaffAssignmentInput,
) {
  return prisma.staffAssignment.update({
    where: { id: assignmentId },
    data: {
      taskRole: input.taskRole,
      taskNote: input.taskNote,
      isBackup: input.isBackup,
      notes:    input.notes,
    },
    include: {
      coordinator: { select: { id: true, fullName: true, username: true, isActive: true } },
    },
  })
}

export async function deleteStaffAssignmentRecord(assignmentId: string) {
  return prisma.staffAssignment.delete({ where: { id: assignmentId } })
}

// ── Roster & self-service views ─────────────────────────────────

/**
 * FR-36 — Coordinator roster: every COORDINATOR-role user, with their
 * upcoming assignment count and next assignment date/event.
 */
export async function getCoordinatorRoster() {
  const coordinators = await prisma.user.findMany({
    where: { role: "COORDINATOR" },
    select: {
      id: true, fullName: true, username: true, isActive: true,
      staffAssignments: {
        where: {
          booking: {
            status: { in: ["CONFIRMED", "PENDING"] },
            eventDate: { gte: new Date() },
          },
        },
        select: {
          bookingId: true,
          booking: { select: { eventDate: true, eventType: true } },
        },
        orderBy: { booking: { eventDate: "asc" } },
      },
    },
    orderBy: { fullName: "asc" },
  })

  return coordinators.map((c) => ({
    id:            c.id,
    fullName:      c.fullName,
    username:      c.username,
    isActive:      c.isActive,
    upcomingCount: c.staffAssignments.length,
    nextAssignment: c.staffAssignments[0]
      ? {
          bookingId: c.staffAssignments[0].bookingId,
          eventDate: c.staffAssignments[0].booking.eventDate.toISOString(),
          eventType: c.staffAssignments[0].booking.eventType,
        }
      : null,
  }))
}

/** A coordinator's own upcoming + recent assignments, for the "My assignments" self-view. */
export async function getMyAssignments(coordinatorId: string) {
  const assignments = await prisma.staffAssignment.findMany({
    where: { coordinatorId },
    include: {
      booking: {
        select: { id: true, eventType: true, eventDate: true, venue: true, status: true },
      },
    },
    orderBy: { booking: { eventDate: "asc" } },
  })

  return assignments.map((a) => ({
    id:            a.id,
    bookingId:     a.bookingId,
    coordinatorId: a.coordinatorId,
    taskRole:      a.taskRole,
    taskNote:      a.taskNote,
    isBackup:      a.isBackup,
    notes:         a.notes,
    assignedAt:    a.assignedAt.toISOString(),
    updatedAt:     a.updatedAt.toISOString(),
    booking: {
      id:        a.booking.id,
      eventType: a.booking.eventType,
      eventDate: a.booking.eventDate.toISOString(),
      venue:     a.booking.venue,
      status:    a.booking.status,
    },
  }))
}

/**
 * Staffing calendar — every booking whose eventDate falls within the
 * given month, with FR-37 compliance pre-computed per booking. Powers
 * the month-grid staffing calendar without an N+1 query per visible day.
 */
export async function getStaffingCalendarMonth(year: number, month: number /* 0-indexed */) {
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
  const end   = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))

  const bookings = await prisma.booking.findMany({
    where: {
      eventDate: { gte: start, lte: end },
      status: { in: ["CONFIRMED", "PENDING"] },
    },
    select: {
      id: true, eventType: true, eventDate: true, venue: true,
      status: true, guestCount: true,
      staffAssignments: {
        select: {
          isBackup: true,
          coordinator: { select: { fullName: true } },
        },
      },
    },
    orderBy: { eventDate: "asc" },
  })

  return bookings.map((b) => {
    const primary = b.staffAssignments.filter((a) => !a.isBackup)
    const recommendation = getStaffingRecommendation(b.guestCount)
    const assignedCount = primary.length
    const isCompliant = assignedCount >= recommendation.min && assignedCount <= recommendation.max

    return {
      bookingId:        b.id,
      eventType:        b.eventType,
      eventDate:        b.eventDate.toISOString(),
      venue:            b.venue,
      status:           b.status,
      guestCount:       b.guestCount,
      assignedCount,
      recommendation,
      isCompliant,
      coordinatorNames: primary.map((a) => a.coordinator.fullName),
    }
  })
}

/**
 * Coordinator dashboard summary — self-scoped stat counts + a short
 * upcoming list, computed in a single query (nested include on each
 * assignment's sibling assignments) to avoid an N+1 compliance check
 * per booking.
 */
export async function getCoordinatorDashboardSummary(coordinatorId: string) {
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const myAssignments = await prisma.staffAssignment.findMany({
    where: {
      coordinatorId,
      booking: {
        status: { in: ["CONFIRMED", "PENDING"] },
        eventDate: { gte: now },
      },
    },
    include: {
      booking: {
        select: {
          id: true, eventType: true, eventDate: true, venue: true, status: true, guestCount: true,
          staffAssignments: { select: { isBackup: true } },
        },
      },
    },
    orderBy: { booking: { eventDate: "asc" } },
  })

  const upcomingCount = myAssignments.length
  const thisWeekCount = myAssignments.filter((a) => a.booking.eventDate <= weekFromNow).length

  const understaffedCount = myAssignments.filter((a) => {
    const recommendation = getStaffingRecommendation(a.booking.guestCount)
    const primaryCount = a.booking.staffAssignments.filter((x) => !x.isBackup).length
    return primaryCount < recommendation.min
  }).length

  const upcoming = myAssignments.slice(0, 5).map((a) => ({
    id:       a.id,
    taskRole: a.taskRole,
    isBackup: a.isBackup,
    booking: {
      id:        a.booking.id,
      eventType: a.booking.eventType,
      eventDate: a.booking.eventDate.toISOString(),
      venue:     a.booking.venue,
      status:    a.booking.status,
    },
  }))

  return { upcomingCount, thisWeekCount, understaffedCount, upcoming }
}
