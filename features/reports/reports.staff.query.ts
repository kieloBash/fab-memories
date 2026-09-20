// features/reports/reports.staff.query.ts
//
// FR-55 — Staff scheduling report: coordinator assignments, staffing
// level vs the FR-37 ratios, backup designations, and same-date conflicts.
// Filter dates apply to the EVENT date. Cancelled events are excluded by
// default (pass bookingStatus=CANCELLED to include them).

import type { BookingStatus, Prisma } from "@/app/generated/prisma/client"
import { getStaffingRecommendation } from "@/features/staff-assignments/staff-assignments.constants"
import { prisma } from "@/lib/prisma"
import { dateOnly, toYmd } from "./reports.dates"
import type { ReportFilterInput } from "./reports.schema"
import { buildMeta, pageSlice, type Paging } from "./reports.shared"
import type { CoordinatorLoadRow, StaffCompliance, StaffReport, StaffReportRow } from "./reports.types"

const ACTIVE_STATUSES: BookingStatus[] = ["CONFIRMED", "PENDING", "CANCELLATION_REQUESTED"]
/** Same statuses the existing FR-40 conflict check treats as "committed". */
const CONFLICT_STATUSES: BookingStatus[] = ["CONFIRMED", "PENDING"]

export async function getStaffReport(
  filters: ReportFilterInput,
  paging: Paging,
): Promise<StaffReport> {
  const t0 = performance.now()

  const bookingWhere: Prisma.BookingWhereInput = {
    status:    filters.bookingStatus ?? { in: ACTIVE_STATUSES },
    eventType: filters.eventType,
    eventDate:
      filters.from || filters.to
        ? {
            gte: filters.from ? dateOnly(filters.from) : undefined,
            lte: filters.to   ? dateOnly(filters.to)   : undefined,
          }
        : undefined,
  }

  const [bookings, coordinators] = await Promise.all([
    prisma.booking.findMany({
      where: bookingWhere,
      select: {
        id: true, eventType: true, eventDate: true, venue: true, status: true, guestCount: true,
        staffAssignments: {
          select: { isBackup: true, coordinatorId: true, coordinator: { select: { fullName: true } } },
          orderBy: [{ isBackup: "asc" }, { assignedAt: "asc" }],
        },
      },
      orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.user.findMany({
      where:   { role: "COORDINATOR" },
      select:  { id: true, fullName: true, isActive: true },
      orderBy: { fullName: "asc" },
    }),
  ])

  // ── Conflicts (FR-40) ───────────────────────────────────────────
  // Looked up independently of the status filter: a coordinator is
  // double-booked whenever two CONFIRMED/PENDING events share a date,
  // even if the filter is only showing one of them.
  const dateKeys = [...new Set(bookings.map((b) => toYmd(b.eventDate)))]
  const sameDayAssignments = dateKeys.length
    ? await prisma.staffAssignment.findMany({
        where: {
          booking: {
            status:    { in: CONFLICT_STATUSES },
            eventDate: { in: dateKeys.map(dateOnly) },
          },
        },
        select: { coordinatorId: true, bookingId: true, booking: { select: { eventDate: true } } },
      })
    : []

  const groups = new Map<string, { coordinatorId: string; bookingIds: Set<string> }>()
  for (const a of sameDayAssignments) {
    const key = `${a.coordinatorId}|${toYmd(a.booking.eventDate)}`
    const g = groups.get(key) ?? { coordinatorId: a.coordinatorId, bookingIds: new Set<string>() }
    g.bookingIds.add(a.bookingId)
    groups.set(key, g)
  }
  const conflictBookingIds = new Set<string>()
  const conflictDatesByCoordinator = new Map<string, number>()
  for (const g of groups.values()) {
    if (g.bookingIds.size < 2) continue
    g.bookingIds.forEach((id) => conflictBookingIds.add(id))
    conflictDatesByCoordinator.set(
      g.coordinatorId,
      (conflictDatesByCoordinator.get(g.coordinatorId) ?? 0) + 1,
    )
  }

  // ── Rows ────────────────────────────────────────────────────────
  let allRows: StaffReportRow[] = bookings.map((b) => {
    const rec = getStaffingRecommendation(b.guestCount)
    const primary = b.staffAssignments.filter((a) => !a.isBackup)
    const backup  = b.staffAssignments.filter((a) => a.isBackup)

    const compliance: StaffCompliance =
      primary.length < rec.min ? "UNDERSTAFFED"
      : primary.length > rec.max ? "OVERSTAFFED"
      : "COMPLIANT"

    return {
      bookingId:           b.id,
      eventType:           b.eventType,
      eventDate:           toYmd(b.eventDate),
      venue:               b.venue,
      bookingStatus:       b.status,
      guestCount:          b.guestCount,
      recommendedMin:      rec.min,
      recommendedMax:      rec.max,
      recommendationLabel: rec.label,
      primaryCount:        primary.length,
      backupCount:         backup.length,
      compliance,
      hasBackup:           backup.length > 0,
      coordinators: [
        ...primary.map((a) => a.coordinator.fullName),
        ...backup.map((a) => `${a.coordinator.fullName} (backup)`),
      ],
      hasConflict: conflictBookingIds.has(b.id),
    }
  })

  if (filters.compliance) allRows = allRows.filter((r) => r.compliance === filters.compliance)

  // ── Coordinator load (over the filtered events) ─────────────────
  const visibleIds = new Set(allRows.map((r) => r.bookingId))
  const load = new Map<string, { primary: number; backup: number }>()
  for (const b of bookings) {
    if (!visibleIds.has(b.id)) continue
    for (const a of b.staffAssignments) {
      const l = load.get(a.coordinatorId) ?? { primary: 0, backup: 0 }
      if (a.isBackup) l.backup++
      else l.primary++
      load.set(a.coordinatorId, l)
    }
  }

  const coordinatorRows: CoordinatorLoadRow[] = coordinators
    .map((c) => ({
      coordinatorId: c.id,
      name:          c.fullName,
      isActive:      c.isActive,
      primaryCount:  load.get(c.id)?.primary ?? 0,
      backupCount:   load.get(c.id)?.backup ?? 0,
      conflictDates: conflictDatesByCoordinator.get(c.id) ?? 0,
    }))
    .sort((a, b) => (b.primaryCount + b.backupCount) - (a.primaryCount + a.backupCount) || a.name.localeCompare(b.name))

  return {
    meta: buildMeta(filters, paging, allRows.length, t0),
    summary: {
      events:              allRows.length,
      compliant:           allRows.filter((r) => r.compliance === "COMPLIANT").length,
      understaffed:        allRows.filter((r) => r.compliance === "UNDERSTAFFED").length,
      overstaffed:         allRows.filter((r) => r.compliance === "OVERSTAFFED").length,
      withoutBackup:       allRows.filter((r) => !r.hasBackup).length,
      eventsWithConflicts: allRows.filter((r) => r.hasConflict).length,
      totalAssignments:    allRows.reduce((s, r) => s + r.primaryCount + r.backupCount, 0),
    },
    coordinators: coordinatorRows,
    rows: pageSlice(allRows, paging),
  }
}
