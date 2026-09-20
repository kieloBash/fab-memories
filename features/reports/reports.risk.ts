// features/reports/reports.risk.ts
//
// Module 8 — the "proactive risk mitigation" layer. Rule-based (no AI, per
// the PRD non-goals): each rule is a plain query over live data with an
// explicit threshold from RISK_THRESHOLDS, so every alert can be explained
// and reproduced. Server-only.
//
// All "today / overdue" logic uses Manila calendar dates (see reports.dates.ts).

import type { BookingStatus } from "@/app/generated/prisma/client"
import { getStaffingRecommendation } from "@/features/staff-assignments/staff-assignments.constants"
import { prisma } from "@/lib/prisma"
import { RISK_KIND_LABELS, RISK_THRESHOLDS as T } from "./reports.constants"
import { addDays, dayDiff, hoursSince, manilaToday, toYmd } from "./reports.dates"
import { getChainIntegrity, num, peso } from "./reports.shared"
import type { RiskIndicator, RiskKind, RiskReport, RiskSeverity } from "./reports.types"

export interface RiskOptions {
  /** Where deep links point. Defaults to the admin area. */
  basePath?: "/staff/admin" | "/staff/coordinator"
  /** Skip the chain-verification cache (used by the audit report, not the dashboard). */
  forceChainCheck?: boolean
  /** Cap on returned items (summary counts always cover everything found). Default: RISK_THRESHOLDS.MAX_ITEMS. */
  maxItems?: number
}

const ACTIVE_FOR_PAYMENT: BookingStatus[] = ["CONFIRMED", "CANCELLATION_REQUESTED"]
const SEVERITY_RANK: Record<RiskSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

interface RiskInput {
  kind:         RiskKind
  severity:     RiskSeverity
  refId:        string
  detail:       string
  title?:       string
  href?:        string | null
  bookingId?:   string | null
  paymentId?:   string | null
  priorityDate: Date
}

export async function getRiskIndicators(options: RiskOptions = {}): Promise<RiskReport> {
  const base = options.basePath ?? "/staff/admin"
  const now = new Date()
  const today = manilaToday(now)
  const imminentEnd = addDays(today, T.IMMINENT_DAYS)
  const staleProofCutoff = new Date(now.getTime() - T.PROOF_STALE_HOURS * 3_600_000)
  const failureWindowStart = new Date(now.getTime() - T.AUDIT_FAILURE_WINDOW_HOURS * 3_600_000)
  const cap = T.MAX_ROWS_PER_RULE

  const bookingHref = (id: string) => `${base}/bookings/${id}`
  const paymentHref = (id: string) => `${base}/payments/${id}`

  const items: RiskInput[] = []
  const add = (i: RiskInput) => items.push(i)

  const [
    staleProofs,
    flagged,
    depositOverdue,
    installmentOverdue,
    fullBalanceCandidates,
    confirmedNoDeposit,
    imminent,
    futureAssignments,
    cancellations,
    upcomingByDate,
    failureCount,
    chain,
  ] = await Promise.all([
    // 1 ── proof waiting too long
    prisma.payment.findMany({
      where: {
        status: "SUBMITTED",
        OR: [
          { submittedAt: { lt: staleProofCutoff } },
          { submittedAt: null, createdAt: { lt: staleProofCutoff } },
        ],
      },
      select: {
        id: true, bookingId: true, amount: true, method: true, paymentType: true,
        submittedAt: true, createdAt: true,
        booking: { select: { client: { select: { fullName: true } } } },
      },
      orderBy: { submittedAt: "asc" },
      take: cap,
    }),

    // 2 ── flagged payments (resolution check happens below)
    prisma.payment.findMany({
      where: { status: "FLAGGED" },
      select: {
        id: true, bookingId: true, amount: true, paymentType: true, installmentId: true,
        createdAt: true, verifiedAt: true,
        booking: { select: { status: true, client: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: "asc" },
      take: cap,
    }),

    // 3 ── deposit due date passed, nothing verified or submitted
    prisma.booking.findMany({
      where: {
        status: "PENDING",
        depositDueDate: { lt: today },
        eventDate: { gte: today },
        payments: { none: { paymentType: "DEPOSIT", status: { in: ["VERIFIED", "SUBMITTED"] } } },
      },
      select: {
        id: true, eventType: true, eventDate: true, depositDueDate: true, depositAmount: true,
        client: { select: { fullName: true } },
      },
      orderBy: { depositDueDate: "asc" },
      take: cap,
    }),

    // 4 ── unpaid installment past due, no proof waiting
    prisma.installment.findMany({
      where: {
        status: "UNPAID",
        dueDate: { lt: today },
        booking: { status: { in: ACTIVE_FOR_PAYMENT } },
        payments: { none: { status: "SUBMITTED" } },
      },
      select: {
        id: true, order: true, dueDate: true, amount: true, bookingId: true,
        booking: { select: { client: { select: { fullName: true } } } },
      },
      orderBy: { dueDate: "asc" },
      take: cap,
    }),

    // 5 ── FULL-plan bookings past their full-payment date
    prisma.booking.findMany({
      where: { status: "CONFIRMED", paymentPlan: "FULL", fullPaymentDueDate: { lt: today } },
      select: {
        id: true, agreedPrice: true, fullPaymentDueDate: true,
        client:   { select: { fullName: true } },
        payments: { select: { status: true, amount: true, paymentType: true } },
      },
      orderBy: { fullPaymentDueDate: "asc" },
      take: cap,
    }),

    // 6 ── CONFIRMED but no verified deposit (business-rule violation)
    prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        eventDate: { gte: today },
        payments: { none: { paymentType: "DEPOSIT", status: "VERIFIED" } },
      },
      select: { id: true, eventType: true, eventDate: true, client: { select: { fullName: true } } },
      orderBy: { eventDate: "asc" },
      take: cap,
    }),

    // 7 ── imminent confirmed events (staffing + vendor coverage)
    prisma.booking.findMany({
      where: { status: "CONFIRMED", eventDate: { gte: today, lte: imminentEnd } },
      select: {
        id: true, eventType: true, eventDate: true, guestCount: true, vendorCategories: true,
        client:           { select: { fullName: true } },
        staffAssignments: { select: { isBackup: true } },
        vendors:          { select: { category: true, confirmedAt: true } },
      },
      orderBy: { eventDate: "asc" },
      take: cap,
    }),

    // 8 ── coordinator assignments on future active bookings (conflict scan)
    prisma.staffAssignment.findMany({
      where: { booking: { status: { in: ["CONFIRMED", "PENDING"] }, eventDate: { gte: today } } },
      select: {
        coordinatorId: true, bookingId: true,
        coordinator: { select: { fullName: true } },
        booking:     { select: { eventDate: true } },
      },
    }),

    // 9 ── client cancellation requests awaiting a decision
    prisma.booking.findMany({
      where: { status: "CANCELLATION_REQUESTED" },
      select: {
        id: true, eventType: true, cancellationRequestedAt: true,
        client: { select: { fullName: true } },
      },
      orderBy: { cancellationRequestedAt: "asc" },
      take: cap,
    }),

    // 10 ─ date contention (also catches two CONFIRMED on one date — NFR-31)
    prisma.booking.findMany({
      where: { status: { in: ["CONFIRMED", "PENDING"] }, eventDate: { gte: today } },
      select: {
        id: true, status: true, eventDate: true, eventType: true,
        client: { select: { fullName: true } },
      },
      orderBy: { eventDate: "asc" },
    }),

    // 11 ─ failed actions in the look-back window
    prisma.auditLog.count({ where: { status: "FAILURE", createdAt: { gte: failureWindowStart } } }),

    // 12 ─ audit chain integrity (cached unless forced). Never fail the whole scan.
    getChainIntegrity(options.forceChainCheck ?? false).catch(() => null),
  ])

  // Rules whose query hit MAX_ROWS_PER_RULE — their counts are a floor ("200+"), not exact.
  const cappedKinds: RiskKind[] = []
  const capIf = (rows: unknown[], ...kinds: RiskKind[]) => { if (rows.length >= cap) cappedKinds.push(...kinds) }
  capIf(staleProofs, "PROOF_UNVERIFIED")
  capIf(flagged, "PAYMENT_FLAGGED")
  capIf(depositOverdue, "DEPOSIT_OVERDUE")
  capIf(installmentOverdue, "INSTALLMENT_OVERDUE")
  capIf(fullBalanceCandidates, "FULL_BALANCE_OVERDUE")
  capIf(confirmedNoDeposit, "CONFIRMED_WITHOUT_DEPOSIT")
  capIf(imminent, "UNDERSTAFFED_IMMINENT", "VENDOR_GAP_IMMINENT")
  capIf(cancellations, "CANCELLATION_PENDING")

  // ── 1. Stale payment proofs ─────────────────────────────────────
  for (const p of staleProofs) {
    const since = p.submittedAt ?? p.createdAt
    const hours = hoursSince(since, now)
    add({
      kind: "PROOF_UNVERIFIED",
      severity: hours >= T.PROOF_CRITICAL_HOURS ? "HIGH" : "MEDIUM",
      refId: p.id,
      title: `${p.booking.client.fullName} — proof awaiting verification`,
      detail: `${peso(num(p.amount))} ${p.paymentType.toLowerCase().replace("_", " ")} via ${p.method}, waiting ${Math.floor(hours)}h`,
      href: paymentHref(p.id),
      bookingId: p.bookingId,
      paymentId: p.id,
      priorityDate: since,
    })
  }

  // ── 2. Flagged payments with no later resubmission ──────────────
  if (flagged.length) {
    const later = await prisma.payment.findMany({
      where: {
        bookingId: { in: [...new Set(flagged.map((f) => f.bookingId))] },
        status: { in: ["SUBMITTED", "VERIFIED"] },
      },
      select: { bookingId: true, paymentType: true, installmentId: true, createdAt: true },
    })
    for (const f of flagged) {
      if (f.booking.status === "CANCELLED") continue
      const resolved = later.some(
        (l) =>
          l.bookingId === f.bookingId &&
          l.paymentType === f.paymentType &&
          (l.installmentId ?? null) === (f.installmentId ?? null) &&
          l.createdAt > f.createdAt,
      )
      if (resolved) continue
      const flaggedAt = f.verifiedAt ?? f.createdAt
      const days = dayDiff(flaggedAt, now)
      add({
        kind: "PAYMENT_FLAGGED",
        severity: days >= T.FLAGGED_CRITICAL_DAYS ? "HIGH" : "MEDIUM",
        refId: f.id,
        title: `${f.booking.client.fullName} — flagged payment not resubmitted`,
        detail: `${peso(num(f.amount))} ${f.paymentType.toLowerCase().replace("_", " ")} flagged ${days} day${days === 1 ? "" : "s"} ago, no corrected proof yet`,
        href: paymentHref(f.id),
        bookingId: f.bookingId,
        paymentId: f.id,
        priorityDate: flaggedAt,
      })
    }
  }

  // ── 3. Deposit overdue ──────────────────────────────────────────
  for (const b of depositOverdue) {
    const due = b.depositDueDate!
    const days = dayDiff(due, today)
    add({
      kind: "DEPOSIT_OVERDUE",
      severity: "HIGH",
      refId: b.id,
      title: `${b.client.fullName} — deposit overdue`,
      detail: `${b.depositAmount ? peso(num(b.depositAmount)) + " " : ""}was due ${toYmd(due)} (${days} day${days === 1 ? "" : "s"} ago); event on ${toYmd(b.eventDate)}`,
      href: bookingHref(b.id),
      bookingId: b.id,
      priorityDate: due,
    })
  }

  // ── 4. Installment overdue ──────────────────────────────────────
  for (const i of installmentOverdue) {
    const days = dayDiff(i.dueDate, today)
    add({
      kind: "INSTALLMENT_OVERDUE",
      severity: "HIGH",
      refId: i.id,
      title: `${i.booking.client.fullName} — installment #${i.order} overdue`,
      detail: `${peso(num(i.amount))} was due ${toYmd(i.dueDate)} (${days} day${days === 1 ? "" : "s"} ago)`,
      href: bookingHref(i.bookingId),
      bookingId: i.bookingId,
      priorityDate: i.dueDate,
    })
  }

  // ── 5. Full balance overdue ─────────────────────────────────────
  for (const b of fullBalanceCandidates) {
    const paid = b.payments
      .filter((p) => p.status === "VERIFIED")
      .reduce((s, p) => s + num(p.amount), 0)
    const remaining = num(b.agreedPrice) - paid
    const awaitingVerification = b.payments.some(
      (p) => p.status === "SUBMITTED" && p.paymentType === "FULL_BALANCE",
    )
    if (remaining <= 0 || awaitingVerification) continue
    const due = b.fullPaymentDueDate!
    const days = dayDiff(due, today)
    add({
      kind: "FULL_BALANCE_OVERDUE",
      severity: "HIGH",
      refId: b.id,
      title: `${b.client.fullName} — full balance overdue`,
      detail: `${peso(remaining)} was due ${toYmd(due)} (${days} day${days === 1 ? "" : "s"} ago)`,
      href: bookingHref(b.id),
      bookingId: b.id,
      priorityDate: due,
    })
  }

  // ── 6. Confirmed without a verified deposit ─────────────────────
  for (const b of confirmedNoDeposit) {
    add({
      kind: "CONFIRMED_WITHOUT_DEPOSIT",
      severity: "HIGH",
      refId: b.id,
      title: `${b.client.fullName} — confirmed without a verified deposit`,
      detail: `${b.eventType.toLowerCase()} on ${toYmd(b.eventDate)} was confirmed but no deposit payment is verified. This violates the deposit-before-confirmation rule.`,
      href: bookingHref(b.id),
      bookingId: b.id,
      priorityDate: b.eventDate,
    })
  }

  // ── 7. Imminent events: staffing + vendor coverage ──────────────
  for (const b of imminent) {
    const daysOut = dayDiff(today, b.eventDate)
    const severity: RiskSeverity = daysOut <= T.CRITICAL_DAYS ? "HIGH" : "MEDIUM"
    const when = daysOut === 0 ? "today" : daysOut === 1 ? "tomorrow" : `in ${daysOut} days`

    const rec = getStaffingRecommendation(b.guestCount)
    const primary = b.staffAssignments.filter((a) => !a.isBackup).length
    if (primary < rec.min) {
      add({
        kind: "UNDERSTAFFED_IMMINENT",
        severity,
        refId: b.id,
        title: `${b.client.fullName} — understaffed ${when}`,
        detail: `${primary} of ${rec.min}${rec.max > rec.min ? `–${rec.max}` : ""} recommended coordinators for ${b.guestCount} guests`,
        href: bookingHref(b.id),
        bookingId: b.id,
        priorityDate: b.eventDate,
      })
    }

    if (b.vendorCategories.length) {
      const confirmedCats = new Set(b.vendors.filter((v) => v.confirmedAt).map((v) => v.category))
      const missing = b.vendorCategories.filter((c) => !confirmedCats.has(c))
      if (missing.length) {
        add({
          kind: "VENDOR_GAP_IMMINENT",
          severity,
          refId: b.id,
          title: `${b.client.fullName} — vendor missing ${when}`,
          detail: `No confirmed vendor for: ${missing.map((c) => c.replace("_", " ").toLowerCase()).join(", ")}`,
          href: bookingHref(b.id),
          bookingId: b.id,
          priorityDate: b.eventDate,
        })
      }
    }
  }

  // ── 8. Coordinator double-booking ───────────────────────────────
  const coordDay = new Map<string, { name: string; date: Date; bookingIds: Set<string> }>()
  for (const a of futureAssignments) {
    const key = `${a.coordinatorId}|${toYmd(a.booking.eventDate)}`
    const g = coordDay.get(key) ?? {
      name: a.coordinator.fullName,
      date: a.booking.eventDate,
      bookingIds: new Set<string>(),
    }
    g.bookingIds.add(a.bookingId)
    coordDay.set(key, g)
  }
  for (const [key, g] of coordDay) {
    if (g.bookingIds.size < 2) continue
    const [firstBooking] = [...g.bookingIds]
    add({
      kind: "COORDINATOR_CONFLICT",
      severity: "HIGH",
      refId: key,
      title: `${g.name} — double-booked on ${toYmd(g.date)}`,
      detail: `Assigned to ${g.bookingIds.size} events on the same date`,
      href: bookingHref(firstBooking),
      bookingId: firstBooking,
      priorityDate: g.date,
    })
  }

  // ── 9. Cancellation requests awaiting a decision ────────────────
  for (const b of cancellations) {
    const since = b.cancellationRequestedAt ?? now
    const hours = hoursSince(since, now)
    add({
      kind: "CANCELLATION_PENDING",
      severity: hours >= T.CANCELLATION_STALE_HOURS ? "HIGH" : "MEDIUM",
      refId: b.id,
      title: `${b.client.fullName} — cancellation request awaiting action`,
      detail: `${b.eventType.toLowerCase()} — requested ${Math.floor(hours)}h ago`,
      href: bookingHref(b.id),
      bookingId: b.id,
      priorityDate: since,
    })
  }

  // ── 10. One date, several claimants ─────────────────────────────
  const byDate = new Map<string, typeof upcomingByDate>()
  for (const b of upcomingByDate) {
    const k = toYmd(b.eventDate)
    byDate.set(k, [...(byDate.get(k) ?? []), b])
  }
  for (const [ymd, list] of byDate) {
    const confirmed = list.filter((b) => b.status === "CONFIRMED")
    const pending   = list.filter((b) => b.status === "PENDING")
    const date = list[0].eventDate

    if (confirmed.length >= 2) {
      add({
        kind: "DOUBLE_CONFIRMED",
        severity: "HIGH",
        refId: ymd,
        title: `${ymd} — ${confirmed.length} confirmed events on one date`,
        detail: `${confirmed.map((b) => b.client.fullName).join(", ")}. The one-event-per-day rule (FR-10 / NFR-31) is violated.`,
        href: bookingHref(confirmed[0].id),
        bookingId: confirmed[0].id,
        priorityDate: date,
      })
    } else if (confirmed.length === 1 && pending.length >= 1) {
      add({
        kind: "DATE_CONTENTION",
        severity: "MEDIUM",
        refId: ymd,
        title: `${ymd} — pending request on a taken date`,
        detail: `${pending.length} pending request${pending.length === 1 ? "" : "s"} (${pending.map((b) => b.client.fullName).join(", ")}) for a date confirmed to ${confirmed[0].client.fullName}. Decline or reschedule.`,
        href: bookingHref(pending[0].id),
        bookingId: pending[0].id,
        priorityDate: date,
      })
    } else if (confirmed.length === 0 && pending.length >= 2) {
      add({
        kind: "DATE_CONTENTION",
        severity: "LOW",
        refId: ymd,
        title: `${ymd} — ${pending.length} competing requests`,
        detail: `${pending.map((b) => b.client.fullName).join(", ")} all requested this date. Only one can be confirmed.`,
        href: bookingHref(pending[0].id),
        bookingId: pending[0].id,
        priorityDate: date,
      })
    }
  }

  // ── 11. Repeated failed actions ─────────────────────────────────
  if (failureCount >= T.AUDIT_FAILURE_WARN) {
    add({
      kind: "AUDIT_FAILURES",
      severity: failureCount >= T.AUDIT_FAILURE_CRITICAL ? "HIGH" : "MEDIUM",
      refId: "window",
      title: `${failureCount} failed actions in the last ${T.AUDIT_FAILURE_WINDOW_HOURS}h`,
      detail: "Review the audit trail filtered by status FAILURE.",
      href: "/staff/admin/audit",
      priorityDate: now,
    })
  }

  // ── 12. Audit chain integrity ───────────────────────────────────
  if (chain && !chain.isValid) {
    add({
      kind: "AUDIT_INTEGRITY",
      severity: "HIGH",
      refId: String(chain.brokenAtSequence ?? "chain"),
      title: "Audit trail integrity check failed",
      detail: `Chain breaks at entry #${chain.brokenAtSequence}. ${chain.reason ?? ""}`.trim(),
      href: "/staff/admin/audit",
      priorityDate: new Date(chain.verifiedAt),
    })
  }

  // ── Assemble ────────────────────────────────────────────────────
  const finished: RiskIndicator[] = items
    .map((i) => ({
      id:           `${i.kind}:${i.refId}`,
      kind:         i.kind,
      severity:     i.severity,
      title:        i.title ?? RISK_KIND_LABELS[i.kind],
      detail:       i.detail,
      href:         i.href ?? null,
      bookingId:    i.bookingId ?? null,
      paymentId:    i.paymentId ?? null,
      priorityDate: i.priorityDate.toISOString(),
    }))
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        a.priorityDate.localeCompare(b.priorityDate),
    )

  const byKind: Partial<Record<RiskKind, number>> = {}
  for (const i of finished) byKind[i.kind] = (byKind[i.kind] ?? 0) + 1

  const high   = finished.filter((i) => i.severity === "HIGH").length
  const medium = finished.filter((i) => i.severity === "MEDIUM").length
  const low    = finished.filter((i) => i.severity === "LOW").length

  return {
    generatedAt: now.toISOString(),
    summary: { high, medium, low, total: finished.length },
    byKind,
    cappedKinds,
    items: finished.slice(0, options.maxItems ?? T.MAX_ITEMS),
  }
}
