// features/reports/reports.payment.query.ts
//
// FR-53 — Payment and transaction report.
//
// Two kinds of figures, deliberately kept apart:
//   • summary  + rows      → the filtered transaction set (date = submission day, Manila)
//   • snapshot + outstanding → "as of now" position of every active booking,
//                              independent of the date filter
//
// Proof URLs are NOT returned: the report never signs storage URLs, so
// report exports can't leak access to payment-proof images (NFR-20).

import type { Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { dayDiff, manilaDayEndUtc, manilaDayStartUtc, manilaToday, toYmd } from "./reports.dates"
import type { ReportFilterInput } from "./reports.schema"
import { buildMeta, num, pagingArgs, round2, type Paging } from "./reports.shared"
import type {
  InstallmentSummary,
  OutstandingBalanceRow,
  PaymentReport,
  PaymentReportRow,
} from "./reports.types"

const ACTIVE_BOOKING_STATUSES = ["CONFIRMED", "CANCELLATION_REQUESTED"] as const
const OUTSTANDING_CAP = 100

export async function getPaymentReport(
  filters: ReportFilterInput,
  paging: Paging,
): Promise<PaymentReport> {
  const t0 = performance.now()
  const today = manilaToday()

  const dateRange =
    filters.from || filters.to
      ? {
          gte: filters.from ? manilaDayStartUtc(filters.from) : undefined,
          lte: filters.to   ? manilaDayEndUtc(filters.to)     : undefined,
        }
      : undefined

  const where: Prisma.PaymentWhereInput = {
    status:      filters.paymentStatus,
    paymentType: filters.paymentType,
    method:      filters.paymentMethod,
    booking:
      filters.bookingStatus || filters.eventType
        ? { status: filters.bookingStatus, eventType: filters.eventType }
        : undefined,
    // A payment's "date" is when it was submitted (createdAt as a fallback).
    ...(dateRange
      ? { OR: [{ submittedAt: dateRange }, { submittedAt: null, createdAt: dateRange }] }
      : {}),
  }

  const [slim, pageRows, activeBookings, activeInstallments] = await Promise.all([
    prisma.payment.findMany({
      where,
      select: { status: true, amount: true, method: true, paymentType: true },
    }),
    prisma.payment.findMany({
      where,
      include: {
        booking:     { select: { eventType: true, eventDate: true, client: { select: { fullName: true } } } },
        verifiedBy:  { select: { fullName: true } },
        installment: { select: { order: true } },
      },
      orderBy: { createdAt: "desc" },
      ...pagingArgs(paging),
    }),
    // ── snapshot inputs ──
    prisma.booking.findMany({
      where: { status: { in: [...ACTIVE_BOOKING_STATUSES] } },
      select: {
        id: true, eventType: true, eventDate: true, paymentPlan: true,
        agreedPrice: true, fullPaymentDueDate: true,
        client:       { select: { fullName: true } },
        payments:     { where: { status: "VERIFIED" }, select: { amount: true } },
        installments: {
          where:   { status: "UNPAID" },
          select:  { dueDate: true },
          orderBy: { dueDate: "asc" },
          take:    1,
        },
      },
    }),
    prisma.installment.findMany({
      where: { booking: { status: { in: [...ACTIVE_BOOKING_STATUSES] } } },
      select: {
        status: true, dueDate: true, amount: true,
        payments: { where: { status: "SUBMITTED" }, select: { id: true } },
      },
    }),
  ])

  // ── Transaction summary ─────────────────────────────────────────
  let verifiedCount = 0, verifiedAmount = 0
  let awaitingCount = 0, awaitingAmount = 0
  let flaggedCount  = 0, flaggedAmount  = 0
  const methodMap = new Map<string, { count: number; amount: number }>()
  const typeMap   = new Map<string, { count: number; amount: number }>()

  for (const p of slim) {
    const amount = num(p.amount)
    if (p.status === "VERIFIED") {
      verifiedCount++;  verifiedAmount += amount
      const m = methodMap.get(p.method) ?? { count: 0, amount: 0 }
      methodMap.set(p.method, { count: m.count + 1, amount: m.amount + amount })
      const t = typeMap.get(p.paymentType) ?? { count: 0, amount: 0 }
      typeMap.set(p.paymentType, { count: t.count + 1, amount: t.amount + amount })
    } else if (p.status === "SUBMITTED") {
      awaitingCount++;  awaitingAmount += amount
    } else if (p.status === "FLAGGED") {
      flaggedCount++;   flaggedAmount += amount
    }
  }

  const rows: PaymentReportRow[] = pageRows.map((p) => ({
    paymentId:        p.id,
    bookingId:        p.bookingId,
    clientName:       p.booking.client.fullName,
    eventType:        p.booking.eventType,
    eventDate:        toYmd(p.booking.eventDate),
    paymentType:      p.paymentType,
    installmentOrder: p.installment?.order ?? null,
    method:           p.method,
    amount:           num(p.amount),
    proofType:        p.proofStoragePath ? "SCREENSHOT" : p.referenceNumber ? "REFERENCE_NUMBER" : "NONE",
    referenceNumber:  p.referenceNumber,
    status:           p.status,
    submittedAt:      p.submittedAt?.toISOString() ?? null,
    reviewedByName:   p.verifiedBy?.fullName ?? null,
    reviewedAt:       p.verifiedAt?.toISOString() ?? null,
    verificationNote: p.verificationNote,
  }))

  // ── Outstanding balances (snapshot) ─────────────────────────────
  const outstandingRows: OutstandingBalanceRow[] = []
  for (const b of activeBookings) {
    const agreed = num(b.agreedPrice)
    const paid   = b.payments.reduce((sum, p) => sum + num(p.amount), 0)
    const outstanding = round2(Math.max(0, agreed - paid))
    if (outstanding <= 0) continue

    const nextDue: Date | null = b.installments[0]?.dueDate ?? b.fullPaymentDueDate ?? null
    const isOverdue = nextDue !== null && nextDue < today

    outstandingRows.push({
      bookingId:    b.id,
      clientName:   b.client.fullName,
      eventType:    b.eventType,
      eventDate:    toYmd(b.eventDate),
      paymentPlan:  b.paymentPlan,
      agreedPrice:  agreed,
      verifiedPaid: round2(paid),
      outstanding,
      nextDueDate:  nextDue ? toYmd(nextDue) : null,
      isOverdue,
      daysOverdue:  isOverdue && nextDue ? dayDiff(nextDue, today) : 0,
    })
  }

  outstandingRows.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
    if (a.isOverdue && b.isOverdue) return b.daysOverdue - a.daysOverdue
    if (a.nextDueDate && b.nextDueDate) return a.nextDueDate.localeCompare(b.nextDueDate)
    if (a.nextDueDate) return -1
    if (b.nextDueDate) return 1
    return b.outstanding - a.outstanding
  })

  // ── Installment summary (snapshot) ──────────────────────────────
  const installments: InstallmentSummary = {
    total: activeInstallments.length,
    paid: 0, unpaid: 0, overdue: 0, awaitingVerification: 0,
    paidAmount: 0, unpaidAmount: 0, overdueAmount: 0,
  }
  for (const i of activeInstallments) {
    const amount = num(i.amount)
    if (i.status === "PAID") {
      installments.paid++
      installments.paidAmount += amount
      continue
    }
    installments.unpaid++
    installments.unpaidAmount += amount
    if (i.payments.length > 0) {
      installments.awaitingVerification++      // proof submitted — not the client's delay
    } else if (i.dueDate < today) {
      installments.overdue++
      installments.overdueAmount += amount
    }
  }
  installments.paidAmount    = round2(installments.paidAmount)
  installments.unpaidAmount  = round2(installments.unpaidAmount)
  installments.overdueAmount = round2(installments.overdueAmount)

  return {
    meta: buildMeta(filters, paging, slim.length, t0),
    summary: {
      transactions:   slim.length,
      verifiedCount,  verifiedAmount: round2(verifiedAmount),
      awaitingCount,  awaitingAmount: round2(awaitingAmount),
      flaggedCount,   flaggedAmount:  round2(flaggedAmount),
      byMethod: [...methodMap.entries()]
        .map(([method, v]) => ({ method, count: v.count, amount: round2(v.amount) }))
        .sort((a, b) => b.amount - a.amount),
      byType: [...typeMap.entries()]
        .map(([paymentType, v]) => ({ paymentType, count: v.count, amount: round2(v.amount) }))
        .sort((a, b) => b.amount - a.amount),
    },
    snapshot: {
      asOf:                today.toISOString().slice(0, 10),
      outstandingTotal:    round2(outstandingRows.reduce((s, r) => s + r.outstanding, 0)),
      bookingsWithBalance: outstandingRows.length,
      overdueBookings:     outstandingRows.filter((r) => r.isOverdue).length,
      installments,
    },
    outstanding: outstandingRows.slice(0, OUTSTANDING_CAP),
    rows,
  }
}
