// features/reports/reports.query.ts
//
// NOTE: the "use server" directive that used to sit at the top of this file
// was removed on purpose. It turned every export into a callable server
// action with no auth check. This module is imported only by route
// handlers, which enforce the role.

import { getStaffingRecommendation } from "@/features/staff-assignments/staff-assignments.constants"
import { prisma } from "@/lib/prisma"
import { addDays, manilaToday } from "./reports.dates"
import { getRiskIndicators } from "./reports.risk"
import type {
  AdminDashboardSummary,
  NeedsAttentionItem,
  RecentAuditItem,
  UpcomingEventSummary,
} from "./reports.types"

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: "Wedding", DEBUT: "Debut", CORPORATE: "Corporate Event",
  BIRTHDAY: "Birthday", OTHER: "Event",
}

const RECENT_AUDIT_LIMIT = 8
const DASHBOARD_RISK_LIMIT = 8

/**
 * Admin dashboard summary (FR-58) — computed server-side in a small
 * number of queries rather than fetching every booking/payment and
 * filtering client-side. The "upcoming bookings" query below is reused
 * for three different derived stats (staffing compliance, vendor
 * coverage, this-week list) to avoid running it three times.
 *
 * MODULE 8 CHANGES
 *  + recentAudit  — latest business activity (report views excluded, so the
 *                   feed isn't dominated by people looking at the feed)
 *  + risks / riskSummary — rule-based proactive risk indicators
 *  + FIX: "upcoming" used `eventDate >= now`. eventDate is a DATE stored at
 *    UTC midnight, so an event happening TODAY compared as "in the past" and
 *    vanished from the dashboard on its own event day. It now compares
 *    against Manila's calendar date.
 *  + FIX: upcomingThisWeekCount was computed AFTER the list was sliced to 6,
 *    so it could never exceed 6. It now counts the full set.
 */
export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const now = new Date()
  const today = manilaToday(now)
  const weekFromNow = addDays(today, 7)

  const [
    activeBookingsCount,
    pendingRequestsCount,
    paymentsToVerifyCount,
    pendingNoTerms,
    submittedPayments,
    cancellationRequests,
    upcomingBookings,
    recentAuditRows,
    riskReport,
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

    // Upcoming (today onward, active) bookings — reused for staffing
    // compliance, vendor coverage, and the "this week" list below.
    prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        eventDate: { gte: today },
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

    // Recent activity feed (FR-58) — excludes report VIEW entries
    prisma.auditLog.findMany({
      where: { NOT: { action: "VIEW", module: "REPORT" } },
      orderBy: { sequence: "desc" },
      take: RECENT_AUDIT_LIMIT,
      include: { user: { select: { fullName: true } } },
    }),

    // Proactive risk indicators
    getRiskIndicators({ basePath: "/staff/admin" }),
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
  const weekBookings = upcomingBookings.filter((b) => b.eventDate <= weekFromNow)
  const upcomingEvents: UpcomingEventSummary[] = weekBookings
    .slice(0, 6)
    .map((b) => ({
      bookingId:  b.id,
      eventType:  b.eventType,
      eventDate:  b.eventDate.toISOString(),
      venue:      b.venue,
      status:     b.status,
      clientName: b.client.fullName,
    }))

  const recentAudit: RecentAuditItem[] = recentAuditRows.map((r) => ({
    id:          r.id,
    sequence:    r.sequence,
    createdAt:   r.createdAt.toISOString(),
    userName:    r.user?.fullName ?? null,
    action:      r.action,
    module:      r.module,
    description: r.description,
    status:      r.status,
  }))

  return {
    activeBookingsCount,
    pendingRequestsCount,
    paymentsToVerifyCount,
    upcomingThisWeekCount: weekBookings.length,   // FIX: was capped at 6 (the list length)
    understaffedCount,
    vendorGapCount,
    needsAttention,
    upcomingEvents,
    generatedAt: now.toISOString(),
    recentAudit,
    risks:       riskReport.items.slice(0, DASHBOARD_RISK_LIMIT),
    riskSummary: riskReport.summary,
  }
}
