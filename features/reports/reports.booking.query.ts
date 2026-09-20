// features/reports/reports.booking.query.ts
//
// FR-52 — Booking and scheduling report. Server-only (imported by
// reports.registry.ts). Filter dates apply to the EVENT date.

import type { Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { dateOnly, toMonthKey, toYmd } from "./reports.dates"
import type { ReportFilterInput } from "./reports.schema"
import { buildMeta, num, pagingArgs, round2, type Paging } from "./reports.shared"
import type { BookingReport, BookingReportRow } from "./reports.types"

const STATUSES    = ["PENDING", "CONFIRMED", "CANCELLED", "CANCELLATION_REQUESTED"] as const
const EVENT_TYPES = ["WEDDING", "DEBUT", "CORPORATE", "BIRTHDAY", "OTHER"] as const

export async function getBookingReport(
  filters: ReportFilterInput,
  paging: Paging,
): Promise<BookingReport> {
  const t0 = performance.now()

  const where: Prisma.BookingWhereInput = {
    status:    filters.bookingStatus,
    eventType: filters.eventType,
    eventDate:
      filters.from || filters.to
        ? {
            gte: filters.from ? dateOnly(filters.from) : undefined,
            lte: filters.to   ? dateOnly(filters.to)   : undefined,
          }
        : undefined,
  }

  // Two queries: a slim projection of the WHOLE filtered set for the
  // summary figures, and one page of full rows for the table.
  const [slim, pageRows] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: { status: true, eventType: true, eventDate: true, agreedPrice: true, guestCount: true },
    }),
    prisma.booking.findMany({
      where,
      include: {
        client:  { select: { fullName: true } },
        package: { select: { name: true } },
      },
      orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
      ...pagingArgs(paging),
    }),
  ])

  // ── Summary ────────────────────────────────────────────────────
  const byStatus:    Record<string, number> = Object.fromEntries(STATUSES.map((s) => [s, 0]))
  const byEventType: Record<string, number> = Object.fromEntries(EVENT_TYPES.map((t) => [t, 0]))
  const monthMap = new Map<string, number>()
  let confirmedValue = 0
  let confirmedGuests = 0

  for (const b of slim) {
    byStatus[b.status]       = (byStatus[b.status] ?? 0) + 1
    byEventType[b.eventType] = (byEventType[b.eventType] ?? 0) + 1
    const month = toMonthKey(b.eventDate)
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1)
    if (b.status === "CONFIRMED") {
      confirmedValue  += num(b.agreedPrice)
      confirmedGuests += b.guestCount
    }
  }

  const rows: BookingReportRow[] = pageRows.map((b) => ({
    bookingId:          b.id,
    clientName:         b.client.fullName,
    eventType:          b.eventType,
    eventDate:          toYmd(b.eventDate),
    venue:              b.venue,
    guestCount:         b.guestCount,
    packageName:        b.package.name,
    status:             b.status,
    isProvincial:       b.isProvincial,
    agreedPrice:        num(b.agreedPrice),
    paymentPlan:        b.paymentPlan,
    cancellationReason: b.cancellationReason,
    createdAt:          b.createdAt.toISOString(),
  }))

  return {
    meta: buildMeta(filters, paging, slim.length, t0),
    summary: {
      total: slim.length,
      byStatus,
      byEventType,
      byMonth: [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
      confirmedValue:  round2(confirmedValue),
      confirmedGuests,
    },
    rows,
  }
}
