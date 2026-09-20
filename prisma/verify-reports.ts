// prisma/verify-reports.ts
/**
 * Module 8 data-layer check. Runs every report query and the risk engine
 * directly (no login needed) and asserts the results against independent
 * Prisma/SQL calculations and against the scenarios planted by
 * `prisma/seed-reports.ts`.
 *
 *   npx tsx prisma/seed.ts            # main seed
 *   npx tsx prisma/seed-reports.ts    # Module 8 scenarios
 *   npx tsx prisma/verify-reports.ts  # this file — exits 1 if anything fails
 *
 * Report timings are printed as evidence for NFR-05 (reports within 10 s).
 * Add `--bulk=1000` to the seed first to check timings under load.
 */

import "dotenv/config"

import { getAuditReport } from "@/features/reports/reports.audit.query"
import { getBookingReport } from "@/features/reports/reports.booking.query"
import { RISK_THRESHOLDS } from "@/features/reports/reports.constants"
import { dateOnly, manilaDayEndUtc, manilaDayStartUtc, manilaYmd, toYmd } from "@/features/reports/reports.dates"
import { buildCsv } from "@/features/reports/reports.export"
import { getPaymentReport } from "@/features/reports/reports.payment.query"
import { getAdminDashboardSummary } from "@/features/reports/reports.query"
import { getRiskIndicators } from "@/features/reports/reports.risk"
import { reportFilterSchema, type ReportFilterInput } from "@/features/reports/reports.schema"
import { getStaffReport } from "@/features/reports/reports.staff.query"
import { getVendorReport } from "@/features/reports/reports.vendor.query"
import type { RiskIndicator, RiskKind } from "@/features/reports/reports.types"
import { prisma } from "@/lib/prisma"

// ── Tiny assertion harness ───────────────────────────────────────

let passed = 0
const failures: string[] = []

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) { passed++; console.log(`  ✅  ${name}`) }
  else {
    failures.push(name)
    console.log(`  ❌  ${name}${detail !== undefined ? `\n        → ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`)
  }
}
const eq = (name: string, actual: unknown, expected: unknown) =>
  check(name, JSON.stringify(actual) === JSON.stringify(expected), { expected, actual })
const near = (a: number, b: number) => Math.abs(a - b) < 0.005

const F = (over: Partial<ReportFilterInput> = {}): ReportFilterInput => reportFilterSchema.parse(over)
const ALL = { mode: "all" } as const
const section = (t: string) => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 60 - t.length))}`)

// ── Scenario lookups ─────────────────────────────────────────────

async function bookingIdOf(label: string): Promise<string | null> {
  const b = await prisma.booking.findFirst({ where: { staffNote: { startsWith: `[seed:reports] ${label}` } }, select: { id: true } })
  return b?.id ?? null
}

async function main() {
  const t0 = Date.now()
  const timings: Record<string, number> = {}
  const time = async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
    const s = performance.now(); const r = await fn(); timings[name] = Math.round(performance.now() - s); return r
  }

  const S = {
    s1: await bookingIdOf("S1-"), s1b: await bookingIdOf("S1b-"), s2: await bookingIdOf("S2-"),
    s2b: await bookingIdOf("S2b-"), s3: await bookingIdOf("S3-"), s4: await bookingIdOf("S4-"),
    s5: await bookingIdOf("S5-"), s6: await bookingIdOf("S6-"), s7: await bookingIdOf("S7-"),
    s8a: await bookingIdOf("S8a-"), s8b: await bookingIdOf("S8b-"), s9: await bookingIdOf("S9-"),
    s10a: await bookingIdOf("S10a-"), s11: await bookingIdOf("S11-"),
  }
  if (!S.s1 || !S.s6) {
    console.error("Scenario data not found — run `npx tsx prisma/seed-reports.ts` first.")
    process.exit(1)
  }

  // ═════════════════════════════════════════════════════════════
  section("Risk engine")
  const risks = await time("risks", () => getRiskIndicators({ forceChainCheck: true, maxItems: Infinity }))
  const find = (kind: RiskKind, bookingId: string | null): RiskIndicator | undefined =>
    risks.items.find((i) => i.kind === kind && i.bookingId === bookingId)

  check("S1  proof 30h        → PROOF_UNVERIFIED / MEDIUM", find("PROOF_UNVERIFIED", S.s1)?.severity === "MEDIUM", find("PROOF_UNVERIFIED", S.s1))
  check("S1b proof 80h        → PROOF_UNVERIFIED / HIGH", find("PROOF_UNVERIFIED", S.s1b)?.severity === "HIGH", find("PROOF_UNVERIFIED", S.s1b))
  check("S2  flagged 9d       → PAYMENT_FLAGGED / HIGH", find("PAYMENT_FLAGGED", S.s2)?.severity === "HIGH", find("PAYMENT_FLAGGED", S.s2))
  check("S2b flag resolved    → nothing raised", !risks.items.some((i) => i.bookingId === S.s2b), risks.items.filter((i) => i.bookingId === S.s2b))
  check("S3  deposit overdue  → DEPOSIT_OVERDUE / HIGH", find("DEPOSIT_OVERDUE", S.s3)?.severity === "HIGH", find("DEPOSIT_OVERDUE", S.s3))
  check("S4  installment late → INSTALLMENT_OVERDUE / HIGH", find("INSTALLMENT_OVERDUE", S.s4)?.severity === "HIGH", find("INSTALLMENT_OVERDUE", S.s4))
  check("S5  balance late     → FULL_BALANCE_OVERDUE / HIGH", find("FULL_BALANCE_OVERDUE", S.s5)?.severity === "HIGH", find("FULL_BALANCE_OVERDUE", S.s5))
  check("S6  understaffed     → UNDERSTAFFED_IMMINENT / HIGH", find("UNDERSTAFFED_IMMINENT", S.s6)?.severity === "HIGH", find("UNDERSTAFFED_IMMINENT", S.s6))
  check("S6  vendor gap       → VENDOR_GAP_IMMINENT / HIGH", find("VENDOR_GAP_IMMINENT", S.s6)?.severity === "HIGH", find("VENDOR_GAP_IMMINENT", S.s6))
  check("S7  fully covered    → nothing raised", !risks.items.some((i) => i.bookingId === S.s7), risks.items.filter((i) => i.bookingId === S.s7))
  check("S8  double-booked coordinator → COORDINATOR_CONFLICT / HIGH",
    risks.items.some((i) => i.kind === "COORDINATOR_CONFLICT" && (i.bookingId === S.s8a || i.bookingId === S.s8b) && i.severity === "HIGH"))
  check("S8  two pending, one date     → DATE_CONTENTION / LOW",
    risks.items.some((i) => i.kind === "DATE_CONTENTION" && i.severity === "LOW" && (i.bookingId === S.s8a || i.bookingId === S.s8b)))
  check("S9  cancellation 100h → CANCELLATION_PENDING / HIGH", find("CANCELLATION_PENDING", S.s9)?.severity === "HIGH", find("CANCELLATION_PENDING", S.s9))
  if (S.s10a) check("S10 two confirmed, one date → DOUBLE_CONFIRMED / HIGH", risks.items.some((i) => i.kind === "DOUBLE_CONFIRMED" && i.severity === "HIGH"))
  check("S11 no verified deposit → CONFIRMED_WITHOUT_DEPOSIT / HIGH", find("CONFIRMED_WITHOUT_DEPOSIT", S.s11)?.severity === "HIGH", find("CONFIRMED_WITHOUT_DEPOSIT", S.s11))
  // Each seed run adds 4 FAILURE entries (which can't be deleted), so derive the expected severity from the data.
  const recentFailures = await prisma.auditLog.count({
    where: { status: "FAILURE", createdAt: { gte: new Date(Date.now() - RISK_THRESHOLDS.AUDIT_FAILURE_WINDOW_HOURS * 3_600_000) } },
  })
  const expectedFailureSeverity = recentFailures >= RISK_THRESHOLDS.AUDIT_FAILURE_CRITICAL ? "HIGH" : "MEDIUM"
  const failureItem = risks.items.find((i) => i.kind === "AUDIT_FAILURES")
  check(`${recentFailures} FAILURE audit entries in 24h → AUDIT_FAILURES / ${expectedFailureSeverity}`,
    failureItem?.severity === expectedFailureSeverity, failureItem)
  check("intact audit chain   → no AUDIT_INTEGRITY", !risks.items.some((i) => i.kind === "AUDIT_INTEGRITY"))

  // Regression: an unpaid past-due installment WITH a submitted proof is "awaiting verification", not overdue.
  const annaDebut = await prisma.booking.findFirst({ where: { venue: "Waterfront Hotel, Lahug, Cebu City" }, select: { id: true } })
  if (annaDebut) {
    check("main seed: past-due installment with proof submitted is NOT overdue",
      !risks.items.some((i) => i.kind === "INSTALLMENT_OVERDUE" && i.bookingId === annaDebut.id))
  }

  const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const
  check("items sorted HIGH → MEDIUM → LOW", risks.items.every((it, k, a) => k === 0 || rank[a[k - 1].severity] <= rank[it.severity]))
  check("no rule silently hit its row cap", risks.cappedKinds.length === 0, risks.cappedKinds)
  check("summary matches the items", risks.summary.total === risks.items.length
    && risks.summary.high === risks.items.filter((i) => i.severity === "HIGH").length
    && risks.summary.total === risks.summary.high + risks.summary.medium + risks.summary.low, risks.summary)

  // ═════════════════════════════════════════════════════════════
  section("Booking report (FR-52)")
  const bAll = await time("bookings", () => getBookingReport(F(), ALL))
  const bCount = await prisma.booking.count()
  eq("total = COUNT(*)", bAll.summary.total, bCount)
  eq("byStatus sums to total", Object.values(bAll.summary.byStatus).reduce((a, b) => a + b, 0), bCount)
  eq("byEventType sums to total", Object.values(bAll.summary.byEventType).reduce((a, b) => a + b, 0), bCount)
  eq("byMonth sums to total", bAll.summary.byMonth.reduce((a, m) => a + m.count, 0), bCount)
  const confAgg = await prisma.booking.aggregate({ where: { status: "CONFIRMED" }, _sum: { agreedPrice: true, guestCount: true } })
  check("confirmedValue = SUM(agreedPrice) of CONFIRMED", near(bAll.summary.confirmedValue, Number(confAgg._sum.agreedPrice ?? 0)))
  eq("confirmedGuests = SUM(guestCount) of CONFIRMED", bAll.summary.confirmedGuests, confAgg._sum.guestCount ?? 0)

  const bConf = await getBookingReport(F({ bookingStatus: "CONFIRMED" }), ALL)
  eq("status filter CONFIRMED", bConf.summary.total, await prisma.booking.count({ where: { status: "CONFIRMED" } }))
  check("status filter → every row CONFIRMED", bConf.rows.every((r) => r.status === "CONFIRMED"))

  const from = toYmd(new Date(Date.now() - 60 * 86400000)), to = manilaYmd()
  const bRange = await getBookingReport(F({ from, to }), ALL)
  eq("event-date range filter", bRange.summary.total, await prisma.booking.count({ where: { eventDate: { gte: dateOnly(from), lte: dateOnly(to) } } }))
  check("range filter → every row inside the range", bRange.rows.every((r) => r.eventDate >= from && r.eventDate <= to))

  const bPage = await getBookingReport(F(), { mode: "page", page: 2, pageSize: 5 })
  eq("paging: page 2 of size 5 returns 5 rows", bPage.rows.length, Math.min(5, Math.max(0, bCount - 5)))
  eq("paging: totalRows unaffected by page size", bPage.meta.totalRows, bCount)
  const bBeyond = await getBookingReport(F(), { mode: "page", page: 9999, pageSize: 25 })
  eq("paging: page beyond the end → no rows", bBeyond.rows.length, 0)
  check("dates are date-only strings", /^\d{4}-\d{2}-\d{2}$/.test(bAll.rows[0]?.eventDate ?? ""))

  // ═════════════════════════════════════════════════════════════
  section("Payment & transaction report (FR-53)")
  const pAll = await time("payments", () => getPaymentReport(F(), ALL))
  eq("transactions = COUNT(*)", pAll.summary.transactions, await prisma.payment.count())
  const vAgg = await prisma.payment.aggregate({ where: { status: "VERIFIED" }, _sum: { amount: true }, _count: true })
  check("verifiedAmount = SUM(VERIFIED)", near(pAll.summary.verifiedAmount, Number(vAgg._sum.amount ?? 0)))
  eq("verifiedCount", pAll.summary.verifiedCount, vAgg._count)
  check("byMethod sums to verifiedAmount", near(pAll.summary.byMethod.reduce((s, m) => s + m.amount, 0), pAll.summary.verifiedAmount))
  check("byType sums to verifiedAmount", near(pAll.summary.byType.reduce((s, m) => s + m.amount, 0), pAll.summary.verifiedAmount))
  eq("flaggedCount", pAll.summary.flaggedCount, await prisma.payment.count({ where: { status: "FLAGGED" } }))
  eq("awaitingCount", pAll.summary.awaitingCount, await prisma.payment.count({ where: { status: "SUBMITTED" } }))
  check("cheque appears on deposits only (business rule)", pAll.rows.filter((r) => r.method === "CHEQUE").every((r) => r.paymentType === "DEPOSIT"))
  check("no proof URLs leak into the report", !JSON.stringify(pAll).includes("proofImageUrl") && !JSON.stringify(pAll).includes("proofStoragePath"))
  check("proofType derived (screenshot / reference / none)", pAll.rows.every((r) => ["SCREENSHOT", "REFERENCE_NUMBER", "NONE"].includes(r.proofType)))

  const flagged = await getPaymentReport(F({ paymentStatus: "FLAGGED" }), ALL)
  check("status filter FLAGGED → only flagged rows", flagged.rows.length > 0 && flagged.rows.every((r) => r.status === "FLAGGED"))
  check("flagged rows show who reviewed them", flagged.rows.every((r) => r.reviewedByName !== null))

  // Outstanding balances (snapshot)
  const o4 = pAll.outstanding.find((o) => o.bookingId === S.s4)
  const o5 = pAll.outstanding.find((o) => o.bookingId === S.s5)
  check("S4 outstanding = 150,000 − 45,000 deposit, overdue 6 days",
    !!o4 && near(o4.outstanding, 105_000) && o4.isOverdue && o4.daysOverdue === 6, o4)
  check("S5 outstanding = 50,000 − 15,000 deposit, overdue 2 days",
    !!o5 && near(o5.outstanding, 35_000) && o5.isOverdue && o5.daysOverdue === 2, o5)
  check("outstanding sorted: overdue first", pAll.outstanding.every((o, k, a) => k === 0 || !(!a[k - 1].isOverdue && o.isOverdue)))
  check("fully-paid past events are not listed as outstanding", !pAll.outstanding.some((o) => o.outstanding <= 0))
  check("snapshot.outstandingTotal = sum of listed (≤100 rows)",
    pAll.snapshot.bookingsWithBalance > 100 || near(pAll.snapshot.outstandingTotal, pAll.outstanding.reduce((s, o) => s + o.outstanding, 0)))
  check("installment summary: S4's #1 counted overdue", pAll.snapshot.installments.overdue >= 1, pAll.snapshot.installments)
  check("installment summary: paid + unpaid = total", pAll.snapshot.installments.paid + pAll.snapshot.installments.unpaid === pAll.snapshot.installments.total)
  if (annaDebut) check("installment summary: submitted-proof installment is 'awaiting verification'", pAll.snapshot.installments.awaitingVerification >= 1)

  // Manila-day date filter
  const today = manilaYmd()
  const pToday = await getPaymentReport(F({ from: today, to: today }), ALL)
  const start = manilaDayStartUtc(today), end = manilaDayEndUtc(today)
  check("date filter uses Manila day boundaries",
    pToday.rows.every((r) => { const t = new Date(r.submittedAt!); return t >= start && t <= end }), pToday.rows.map((r) => r.submittedAt))

  // ═════════════════════════════════════════════════════════════
  section("Vendor coordination report (FR-54)")
  const vAll = await time("vendors", () => getVendorReport(F(), ALL))
  const activeStatuses = ["CONFIRMED", "PENDING", "CANCELLATION_REQUESTED"] as const
  eq("assignments = COUNT(active bookings' assignments)", vAll.summary.totalAssignments,
    await prisma.bookingVendor.count({ where: { booking: { status: { in: [...activeStatuses] } } } }))
  eq("confirmed + contacted + notContacted = total", vAll.summary.confirmed + vAll.summary.contacted + vAll.summary.notContacted, vAll.summary.totalAssignments)
  const qAgg = await prisma.bookingVendor.aggregate({ where: { booking: { status: { in: [...activeStatuses] } } }, _sum: { quotationAmount: true }, _count: { quotationAmount: true } })
  check("quotationTotal = SUM(quotationAmount)", near(vAll.summary.quotationTotal, Number(qAgg._sum.quotationAmount ?? 0)))
  eq("quotedCount", vAll.summary.quotedCount, qAgg._count.quotationAmount)
  check("quotations planted by the seed are included (≥ ₱62,500)", vAll.summary.quotationTotal >= 62_500, vAll.summary.quotationTotal)
  const gap6 = vAll.gaps.find((g) => g.bookingId === S.s6)
  check("S6 appears in gaps, missing CATERING only", !!gap6 && JSON.stringify(gap6.missing) === JSON.stringify(["CATERING"]), gap6)
  check("S7 (fully covered) is not in gaps", !vAll.gaps.some((g) => g.bookingId === S.s7))
  check("gaps only list upcoming events", vAll.gaps.every((g) => g.eventDate >= manilaYmd()))
  const vFlo = await getVendorReport(F({ vendorCategory: "FLORALS" }), ALL)
  check("category filter FLORALS", vFlo.rows.length > 0 && vFlo.rows.every((r) => r.category === "FLORALS"))
  check("cancelled events excluded by default", vAll.rows.every((r) => r.bookingStatus !== "CANCELLED"))

  // ═════════════════════════════════════════════════════════════
  section("Staff scheduling report (FR-55)")
  const stAll = await time("staff", () => getStaffReport(F(), ALL))
  const r6 = stAll.rows.find((r) => r.bookingId === S.s6)
  const r7 = stAll.rows.find((r) => r.bookingId === S.s7)
  check("S6: 160 guests → 8–12 recommended, 3 assigned, UNDERSTAFFED",
    !!r6 && r6.recommendedMin === 8 && r6.recommendedMax === 12 && r6.primaryCount === 3 && r6.compliance === "UNDERSTAFFED", r6)
  check("S7: 40 guests → 4–5 recommended, 4 assigned, COMPLIANT, no backup",
    !!r7 && r7.recommendedMin === 4 && r7.primaryCount === 4 && r7.compliance === "COMPLIANT" && !r7.hasBackup, r7)
  const r8 = stAll.rows.filter((r) => r.bookingId === S.s8a || r.bookingId === S.s8b)
  check("S8: both same-date events flagged as conflicts", r8.length === 2 && r8.every((r) => r.hasConflict), r8)
  eq("summary partitions the events", stAll.summary.compliant + stAll.summary.understaffed + stAll.summary.overstaffed, stAll.summary.events)
  const understaffed = await getStaffReport(F({ compliance: "UNDERSTAFFED" }), ALL)
  check("compliance filter UNDERSTAFFED", understaffed.rows.length > 0 && understaffed.rows.every((r) => r.compliance === "UNDERSTAFFED"))
  eq("summary follows the compliance filter", understaffed.summary.events, understaffed.rows.length)
  const paolo = stAll.coordinators.find((c) => c.name === "Paolo Mendoza")
  check("coordinator load lists Paolo with a conflicting date", !!paolo && paolo.conflictDates >= 1, paolo)
  check("coordinator load lists all coordinators", stAll.coordinators.length === await prisma.user.count({ where: { role: "COORDINATOR" } }))
  check("cancelled events excluded by default", stAll.rows.every((r) => r.bookingStatus !== "CANCELLED"))

  // ═════════════════════════════════════════════════════════════
  section("Audit trail report (FR-56)")
  const aAll = await time("audit", () => getAuditReport(F(), ALL))
  const aCount = await prisma.auditLog.count()
  eq("totalEntries = COUNT(*)", aAll.summary.totalEntries, aCount)
  eq("byModule sums to total", aAll.summary.byModule.reduce((s, m) => s + m.count, 0), aCount)
  eq("byAction sums to total", aAll.summary.byAction.reduce((s, m) => s + m.count, 0), aCount)
  eq("byDay (Manila) sums to total", aAll.summary.byDay.reduce((s, d) => s + d.count, 0), aCount)
  check("byDay dates are ascending YYYY-MM-DD", aAll.summary.byDay.every((d, k, a) => /^\d{4}-\d{2}-\d{2}$/.test(d.date) && (k === 0 || a[k - 1].date < d.date)))
  check("hash chain verified fresh and intact", aAll.chain.isValid, aAll.chain)
  check("failureCount ≥ 4 (seeded)", aAll.summary.failureCount >= 4, aAll.summary.failureCount)
  check("rows newest-first by sequence", aAll.rows.every((r, k, a) => k === 0 || a[k - 1].sequence > r.sequence))
  const aFail = await getAuditReport(F({ status: "FAILURE" }), ALL)
  eq("status=FAILURE filter", aFail.summary.totalEntries, await prisma.auditLog.count({ where: { status: "FAILURE" } }))
  eq("status=FAILURE byDay agrees with filter", aFail.summary.byDay.reduce((s, d) => s + d.count, 0), aFail.summary.totalEntries)
  const aMod = await getAuditReport(F({ module: "PAYMENT" }), ALL)
  eq("module=PAYMENT filter (rows + byDay)", [aMod.summary.totalEntries, aMod.summary.byDay.reduce((s, d) => s + d.count, 0)],
    [await prisma.auditLog.count({ where: { module: "PAYMENT" } }), await prisma.auditLog.count({ where: { module: "PAYMENT" } })])
  const aSearch = await getAuditReport(F({ search: "flagged" }), ALL)
  check("search filter (rows and byDay agree)", aSearch.rows.length > 0 && aSearch.summary.byDay.reduce((s, d) => s + d.count, 0) === aSearch.summary.totalEntries)
  const aToday = await getAuditReport(F({ from: manilaYmd(), to: manilaYmd() }), ALL)
  check("today's Manila day covers entries written today", aToday.summary.totalEntries > 0 && aToday.summary.byDay.length === 1, aToday.summary.byDay)

  // ═════════════════════════════════════════════════════════════
  section("Dashboard (FR-58)")
  const dash = await time("dashboard", () => getAdminDashboardSummary())
  check("recentAudit is capped at 8", dash.recentAudit.length <= 8)
  check("recentAudit excludes report-view noise", dash.recentAudit.every((r) => !(r.action === "VIEW" && r.module === "REPORT")))
  check("risks capped at 8 and consistent with riskSummary", dash.risks.length <= 8 && dash.riskSummary.total >= dash.risks.length)
  check("dashboard risk summary equals the risk engine", dash.riskSummary.total === risks.summary.total && dash.riskSummary.high === risks.summary.high, { dash: dash.riskSummary, engine: risks.summary })
  check("upcoming-this-week count is not capped by the list length", dash.upcomingThisWeekCount >= dash.upcomingEvents.length)
  check("S6 (in 5 days) is in this week's list", dash.upcomingEvents.some((e) => e.bookingId === S.s6))

  // FIX check — an event happening TODAY must not vanish from the dashboard.
  const client = await prisma.user.findFirst({ where: { role: "CLIENT" } })
  const pkg = await prisma.package.findFirst()
  const tmp = await prisma.booking.create({
    data: {
      clientId: client!.id, packageId: pkg!.id, eventType: "OTHER", eventDate: dateOnly(manilaYmd()),
      venue: "TMP today", guestCount: 30, clientPhone: "0", agreedPrice: 1, status: "CONFIRMED",
      staffNote: "[seed:reports] TMP-today",
    },
  })
  try {
    const d2 = await getAdminDashboardSummary()
    check("FIX: an event happening today still appears on the dashboard", d2.upcomingEvents.some((e) => e.bookingId === tmp.id))
  } finally {
    await prisma.booking.delete({ where: { id: tmp.id } })
  }

  // ═════════════════════════════════════════════════════════════
  section("CSV export builder")
  const csv = buildCsv([{ a: "=HYPERLINK(\"http://x\")", b: "+1", c: "@SUM(1)", d: "-2+3", e: 5, f: -7, g: "safe, with comma" }],
    ["a", "b", "c", "d", "e", "f", "g"].map((k) => ({ key: k, label: k.toUpperCase() })))
  check("starts with a UTF-8 BOM (Excel renders ₱)", csv.charCodeAt(0) === 0xfeff)
  check("formula-looking strings are neutralised", csv.includes(`"'=HYPERLINK`) && csv.includes("'+1") && csv.includes("'@SUM") && csv.includes("'-2+3"))
  check("real numbers (incl. negatives) are untouched", csv.includes(",5,-7,"))
  check("commas are quoted", csv.includes('"safe, with comma"'))
  eq("empty result → header row only", buildCsv([], [{ key: "a", label: "A" }, { key: "b", label: "B" }]), "\uFEFFA,B\n")

  // ═════════════════════════════════════════════════════════════
  section("Filter schema")
  check("rejects from > to", !reportFilterSchema.safeParse({ from: "2026-10-02", to: "2026-10-01" }).success)
  check("rejects a malformed date", !reportFilterSchema.safeParse({ from: "10/01/2026" }).success)
  check("rejects an unknown enum value", !reportFilterSchema.safeParse({ bookingStatus: "DONE" }).success)
  check("rejects pageSize > 200", !reportFilterSchema.safeParse({ pageSize: 500 }).success)
  eq("applies paging defaults", (({ page, pageSize }) => ({ page, pageSize }))(reportFilterSchema.parse({})), { page: 1, pageSize: 25 })

  // ═════════════════════════════════════════════════════════════
  section("Timings (NFR-05: every report ≤ 10 000 ms)")
  const rows = Object.entries(timings)
  for (const [name, ms] of rows) check(`${name.padEnd(10)} ${String(ms).padStart(6)} ms`, ms <= 10_000)
  const sizes = { bookings: bCount, payments: await prisma.payment.count(), audit: aCount }
  console.log(`  ℹ️   dataset: ${sizes.bookings} bookings, ${sizes.payments} payments, ${sizes.audit} audit entries`)
  console.log(`  ℹ️   thresholds: proof stale ${RISK_THRESHOLDS.PROOF_STALE_HOURS}h, imminent ${RISK_THRESHOLDS.IMMINENT_DAYS}d`)

  // ── Result ────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(64)}`)
  console.log(`  ${passed} passed, ${failures.length} failed  (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
  if (failures.length) { console.log("\n  Failed:"); failures.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
