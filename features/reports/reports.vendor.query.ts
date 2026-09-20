// features/reports/reports.vendor.query.ts
//
// FR-54 — Vendor coordination report: assignments, confirmation status,
// quotations, and coverage gaps. Filter dates apply to the EVENT date.
// By default cancelled events are excluded (their vendor rows are noise);
// pass bookingStatus=CANCELLED to see them.

import type { BookingStatus, Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { EXPORT_ROW_LIMIT } from "./reports.constants"
import { dateOnly, manilaToday, toYmd } from "./reports.dates"
import type { ReportFilterInput } from "./reports.schema"
import { buildMeta, num, numOrNull, pageSlice, round2, type Paging } from "./reports.shared"
import type { VendorAssignmentStatus, VendorGapRow, VendorReport, VendorReportRow } from "./reports.types"

const ACTIVE_STATUSES: BookingStatus[] = ["CONFIRMED", "PENDING", "CANCELLATION_REQUESTED"]

export async function getVendorReport(
  filters: ReportFilterInput,
  paging: Paging,
): Promise<VendorReport> {
  const t0 = performance.now()
  const today = manilaToday()

  const fromDate = filters.from ? dateOnly(filters.from) : undefined
  const toDate   = filters.to   ? dateOnly(filters.to)   : undefined

  const bookingWhere: Prisma.BookingWhereInput = {
    status:    filters.bookingStatus ?? { in: ACTIVE_STATUSES },
    eventType: filters.eventType,
    eventDate: fromDate || toDate ? { gte: fromDate, lte: toDate } : undefined,
  }

  // Gaps only make sense for events that haven't happened yet.
  const gapFrom = fromDate && fromDate > today ? fromDate : today
  const gapWhere: Prisma.BookingWhereInput = {
    ...bookingWhere,
    eventDate: { gte: gapFrom, lte: toDate },
    vendorCategories: { isEmpty: false },
  }

  const [assignments, gapBookings] = await Promise.all([
    prisma.bookingVendor.findMany({
      where: { category: filters.vendorCategory, booking: bookingWhere },
      include: {
        vendor:  { select: { name: true } },
        booking: { select: { eventType: true, eventDate: true, venue: true, status: true } },
      },
      orderBy: [{ booking: { eventDate: "asc" } }, { category: "asc" }],
      take: EXPORT_ROW_LIMIT,
    }),
    prisma.booking.findMany({
      where: gapWhere,
      select: {
        id: true, eventType: true, eventDate: true, status: true, vendorCategories: true,
        client:  { select: { fullName: true } },
        vendors: { select: { category: true, confirmedAt: true } },
      },
      orderBy: { eventDate: "asc" },
    }),
  ])

  // ── Rows ────────────────────────────────────────────────────────
  const allRows: VendorReportRow[] = assignments.map((a) => {
    const status: VendorAssignmentStatus = a.confirmedAt
      ? "CONFIRMED"
      : a.contactedAt ? "CONTACTED" : "NOT_CONTACTED"
    return {
      assignmentId:    a.id,
      bookingId:       a.bookingId,
      eventType:       a.booking.eventType,
      eventDate:       toYmd(a.booking.eventDate),
      venue:           a.booking.venue,
      bookingStatus:   a.booking.status,
      vendorName:      a.vendor.name,
      category:        a.category,
      status,
      contactedAt:     a.contactedAt?.toISOString() ?? null,
      confirmedAt:     a.confirmedAt?.toISOString() ?? null,
      quotationAmount: numOrNull(a.quotationAmount),
      quotationNote:   a.quotationNote,
    }
  })

  // ── Summary ─────────────────────────────────────────────────────
  let confirmed = 0, contacted = 0, notContacted = 0, quotedCount = 0, quotationTotal = 0
  const catMap = new Map<string, { assignments: number; confirmed: number; quotationTotal: number }>()

  for (const r of allRows) {
    if (r.status === "CONFIRMED") confirmed++
    else if (r.status === "CONTACTED") contacted++
    else notContacted++

    if (r.quotationAmount !== null) { quotedCount++; quotationTotal += r.quotationAmount }

    const c = catMap.get(r.category) ?? { assignments: 0, confirmed: 0, quotationTotal: 0 }
    c.assignments++
    if (r.status === "CONFIRMED") c.confirmed++
    c.quotationTotal += num(r.quotationAmount)
    catMap.set(r.category, c)
  }

  // ── Coverage gaps ───────────────────────────────────────────────
  const gaps: VendorGapRow[] = []
  for (const b of gapBookings) {
    const confirmedCats = new Set(b.vendors.filter((v) => v.confirmedAt !== null).map((v) => v.category))
    let missing = b.vendorCategories.filter((c) => !confirmedCats.has(c))
    if (filters.vendorCategory) missing = missing.filter((c) => c === filters.vendorCategory)
    if (missing.length === 0) continue
    gaps.push({
      bookingId:     b.id,
      clientName:    b.client.fullName,
      eventType:     b.eventType,
      eventDate:     toYmd(b.eventDate),
      bookingStatus: b.status,
      requested:     b.vendorCategories,
      missing,
    })
  }

  return {
    meta: buildMeta(filters, paging, allRows.length, t0),
    summary: {
      totalAssignments: allRows.length,
      confirmed, contacted, notContacted, quotedCount,
      quotationTotal: round2(quotationTotal),
      byCategory: [...catMap.entries()]
        .map(([category, v]) => ({ category, ...v, quotationTotal: round2(v.quotationTotal) }))
        .sort((a, b) => b.assignments - a.assignments),
      gapEvents: gaps.length,
    },
    gaps,
    rows: pageSlice(allRows, paging),
  }
}
