// features/reports/reports.query.ts
"use server"

import { prisma } from "@/lib/prisma"
import { getStaffingRecommendation } from "@/features/staff-assignments/staff-assignments.constants"
import type {
  AdminDashboardSummary,
  NeedsAttentionItem,
  UpcomingEventSummary,
} from "./reports.types"

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: "Wedding", DEBUT: "Debut", CORPORATE: "Corporate Event",
  BIRTHDAY: "Birthday", OTHER: "Event",
}

/**
 * Admin dashboard summary (FR-58) — computed server-side in a small
 * number of queries rather than fetching every booking/payment and
 * filtering client-side (which is what the previous dashboard did).
 * The "upcoming bookings" query below is reused for three different
 * derived stats (staffing compliance, vendor coverage, this-week list)
 * to avoid running it three times.
 */
export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    activeBookingsCount,
    pendingRequestsCount,
    paymentsToVerifyCount,
    pendingNoTerms,
    submittedPayments,
    cancellationRequests,
    upcomingBookings,
  ] = await Promise.all([
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "SUBMITTED" } }),

    // Needs attention — PENDING bookings with no contract terms set yet
    prisma.booking.findMany({
      where: { status: "PENDING", paymentPlan: null },
      select: {
        id: true, eventType: true, guestCount: true, createdAt: true,
        client: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // Needs attention — submitted payments awaiting verification
    prisma.payment.findMany({
      where: { status: "SUBMITTED" },
      select: {
        id: true, bookingId: true, amount: true, method: true, submittedAt: true, createdAt: true,
        booking: { select: { client: { select: { fullName: true } } } },
      },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),

    // Needs attention — client-requested cancellations awaiting admin action
    prisma.booking.findMany({
      where: { status: "CANCELLATION_REQUESTED" },
      select: {
        id: true, eventType: true, cancellationRequestedAt: true,
        client: { select: { fullName: true } },
      },
      orderBy: { cancellationRequestedAt: "desc" },
      take: 5,
    }),

    // Upcoming (future, active) bookings — reused for staffing compliance,
    // vendor coverage, and the "this week" list below.
    prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        eventDate: { gte: now },
      },
      select: {
        id: true, eventType: true, eventDate: true, venue: true, status: true, guestCount: true,
        vendorCategories: true,
        client: { select: { fullName: true } },
        staffAssignments: { select: { isBackup: true } },
        vendors: { select: { category: true, confirmedAt: true } },
      },
      orderBy: { eventDate: "asc" },
    }),
  ])

  // ── Merge "needs attention" from three sources ──────────────────
  const needsAttention: NeedsAttentionItem[] = [
    ...pendingNoTerms.map((b): NeedsAttentionItem => ({
      kind: "CONTRACT_TERMS",
      bookingId: b.id,
      label: b.client.fullName,
      detail: `${EVENT_TYPE_LABELS[b.eventType] ?? b.eventType} · ${b.guestCount} guests — needs contract terms`,
      href: `/staff/admin/bookings/${b.id}`,
      createdAt: b.createdAt.toISOString(),
    })),
    ...submittedPayments.map((p): NeedsAttentionItem => ({
      kind: "PAYMENT_REVIEW",
      bookingId: p.bookingId,
      paymentId: p.id,
      label: p.booking.client.fullName,
      detail: `₱${Number(p.amount).toLocaleString()} via ${p.method} — awaiting verification`,
      href: `/staff/admin/payments/${p.id}`,
      createdAt: (p.submittedAt ?? p.createdAt).toISOString(),
    })),
    ...cancellationRequests.map((b): NeedsAttentionItem => ({
      kind: "CANCELLATION_REQUEST",
      bookingId: b.id,
      label: b.client.fullName,
      detail: `${EVENT_TYPE_LABELS[b.eventType] ?? b.eventType} — cancellation requested`,
      href: `/staff/admin/bookings/${b.id}`,
      createdAt: (b.cancellationRequestedAt ?? new Date()).toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
   .slice(0, 8)

  // ── Staffing compliance (FR-37) across upcoming events ──────────
  const understaffedCount = upcomingBookings.filter((b) => {
    const recommendation = getStaffingRecommendation(b.guestCount)
    const primaryCount = b.staffAssignments.filter((a) => !a.isBackup).length
    return primaryCount < recommendation.min
  }).length

  // ── Vendor coverage gaps across upcoming events ─────────────────
  const vendorGapCount = upcomingBookings.filter((b) => {
    if (b.vendorCategories.length === 0) return false
    const confirmedCategories = new Set(
      b.vendors.filter((v) => v.confirmedAt !== null).map((v) => v.category),
    )
    return b.vendorCategories.some((cat) => !confirmedCategories.has(cat))
  }).length

  // ── This week's events ───────────────────────────────────────────
  const upcomingEvents: UpcomingEventSummary[] = upcomingBookings
    .filter((b) => new Date(b.eventDate) <= weekFromNow)
    .slice(0, 6)
    .map((b) => ({
      bookingId:  b.id,
      eventType:  b.eventType,
      eventDate:  b.eventDate.toISOString(),
      venue:      b.venue,
      status:     b.status,
      clientName: b.client.fullName,
    }))

  const upcomingThisWeekCount = upcomingEvents.length

  return {
    activeBookingsCount,
    pendingRequestsCount,
    paymentsToVerifyCount,
    upcomingThisWeekCount,
    understaffedCount,
    vendorGapCount,
    needsAttention,
    upcomingEvents,
  }
}
