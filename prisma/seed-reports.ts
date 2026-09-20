// prisma/seed-reports.ts
/**
 * Module 8 demo data — ADDITIVE. Run it AFTER the main seed (`prisma/seed.ts`),
 * which creates the users, packages and vendors this script attaches to.
 *
 *   npx tsx prisma/seed-reports.ts                 # scenarios + history + audit entries
 *   npx tsx prisma/seed-reports.ts --bulk=1000     # ...plus 1,000 past bookings (NFR-05 perf test)
 *   npx tsx prisma/seed-reports.ts --reset-only    # remove everything this script created
 *
 * Re-running is safe: previously seeded rows are removed first. Rows are
 * recognisable by Booking.staffNote starting with "[seed:reports".
 * (Audit-log entries can NOT be removed — the trail is immutable by design.)
 *
 * Every RISK RULE gets a scenario, labelled S1…S11 in staffNote, so the
 * dashboard's risk panel is fully populated:
 *
 *   S1   proof waiting 30 h                     → PROOF_UNVERIFIED (medium)
 *   S1b  proof waiting 80 h                     → PROOF_UNVERIFIED (high)
 *   S2   flagged 9 days ago, never resubmitted  → PAYMENT_FLAGGED  (high)
 *   S2b  flagged, then resubmitted + verified   → (nothing — proves resolved flags are ignored)
 *   S3   deposit due date passed                → DEPOSIT_OVERDUE
 *   S4   installment #1 past due, no proof      → INSTALLMENT_OVERDUE
 *   S5   full-balance date passed               → FULL_BALANCE_OVERDUE
 *   S6   event in 5 days: 3/8 coordinators, photographer ok, caterer not confirmed
 *                                               → UNDERSTAFFED_IMMINENT + VENDOR_GAP_IMMINENT
 *   S7   event in 20 days, fully staffed and covered, quotations recorded → (nothing)
 *   S8   two PENDING bookings, same date, same coordinator
 *                                               → COORDINATOR_CONFLICT + DATE_CONTENTION (low)
 *   S9   cancellation requested 100 h ago       → CANCELLATION_PENDING (high)
 *   S10  two CONFIRMED events on one date       → DOUBLE_CONFIRMED   (only on a database WITHOUT the Module 9 index; skipped otherwise)
 *   S11  CONFIRMED with no verified deposit     → CONFIRMED_WITHOUT_DEPOSIT (deliberate rule violation)
 *   +    4 FAILURE audit entries in the last hour → AUDIT_FAILURES
 *
 * S10 and S11 intentionally break business rules to show the monitoring layer
 * catching them. S10 is skipped automatically if you later add a DB-level
 * one-confirmed-per-day constraint.
 */

import "dotenv/config"

import {
  BookingStatus,
  EventType,
  InstallmentStatus,
  PaymentMethod,
  PaymentPlan,
  PaymentStatus,
  PaymentType,
  PrismaClient,
  StaffTaskRole,
  VendorCategory,
} from "@/app/generated/prisma/client"
import { addDays, manilaToday } from "@/features/reports/reports.dates"
import { logAction } from "@/lib/audit/log"
import { PrismaPg } from "@prisma/adapter-pg"
import { randomUUID } from "node:crypto"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

const TAG = "[seed:reports]"
const BULK_TAG = "[seed:reports:bulk]"

// ── CLI ──────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const RESET_ONLY = args.includes("--reset-only")
const BULK = Number(args.find((a) => a.startsWith("--bulk="))?.split("=")[1] ?? 0)

// ── Time helpers (Manila-aware, like the reports themselves) ─────

const TODAY = manilaToday()
/** Date-only value `n` days from Manila today (for @db.Date columns). */
const day = (n: number) => addDays(TODAY, n)
/** A real timestamp `h` hours in the past. */
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000)

// ── Lookups ──────────────────────────────────────────────────────

type Who = "admin" | "coordinator" | "coordinator2" | "coordinator3" | "coordinator4" | "anna" | "ben"
const USERNAME: Record<Who, string> = {
  admin: "admin", coordinator: "coordinator", coordinator2: "coordinator2",
  coordinator3: "coordinator3", coordinator4: "coordinator4",
  anna: "client_anna", ben: "client_ben",
}
const uid: Partial<Record<Who, string>> = {}
const pkgByType: Partial<Record<EventType, string>> = {}
const vendorByCat: Partial<Record<VendorCategory, string>> = {}

async function loadRefs() {
  for (const [who, username] of Object.entries(USERNAME) as [Who, string][]) {
    const u = await prisma.user.findUnique({ where: { username } })
    if (!u) throw new Error(`User "${username}" not found — run the main seed (prisma/seed.ts) first.`)
    uid[who] = u.id
  }
  for (const type of Object.values(EventType)) {
    const p = await prisma.package.findFirst({ where: { eventType: type } })
    if (p) pkgByType[type] = p.id
  }
  for (const cat of Object.values(VendorCategory)) {
    const v = await prisma.vendor.findFirst({ where: { category: cat } })
    if (v) vendorByCat[cat] = v.id
  }
}
const id = (w: Who) => uid[w]!

// ── Builders ─────────────────────────────────────────────────────

interface BookingOpts {
  client: "anna" | "ben"
  type: EventType
  date: Date
  status: BookingStatus
  guests: number
  price: number
  label: string
  provincial?: boolean
  plan?: PaymentPlan | null
  depositAmount?: number
  depositDueDate?: Date
  fullPaymentDueDate?: Date
  vendorCategories?: VendorCategory[]
  cancellationRequestedAt?: Date
  cancellationReason?: string
  createdAt?: Date
  depositVerifiedAt?: Date
}

async function mkBooking(o: BookingOpts) {
  const pkg = pkgByType[o.type] ?? pkgByType[EventType.WEDDING]!
  return prisma.booking.create({
    data: {
      clientId: id(o.client),
      packageId: pkg,
      eventType: o.type,
      eventDate: o.date,
      venue: `${o.label} venue, Metro Manila`,
      guestCount: o.guests,
      clientPhone: "09170000000",
      isProvincial: o.provincial ?? false,
      agreedPrice: o.price,
      status: o.status,
      paymentPlan: o.plan ?? null,
      depositAmount: o.depositAmount,
      depositDueDate: o.depositDueDate,
      fullPaymentDueDate: o.fullPaymentDueDate,
      vendorCategories: o.vendorCategories ?? [],
      cancellationRequestedAt: o.cancellationRequestedAt,
      cancellationRequestReason: o.cancellationRequestedAt ? (o.cancellationReason ?? "Change of plans") : undefined,
      cancellationReason: o.status === BookingStatus.CANCELLED ? (o.cancellationReason ?? "Client cancelled") : undefined,
      depositVerifiedAt: o.depositVerifiedAt,
      depositVerifiedById: o.depositVerifiedAt ? id("coordinator") : undefined,
      staffNote: `${TAG} ${o.label}`,
      createdAt: o.createdAt,
    },
  })
}

interface PayOpts {
  type: PaymentType
  method: PaymentMethod
  amount: number
  status: PaymentStatus
  at: Date                    // submittedAt (and createdAt)
  reviewedAt?: Date
  ref?: string
  screenshot?: boolean
  installmentId?: string
  note?: string
}
async function mkPayment(bookingId: string, o: PayOpts) {
  const reviewed = o.status === PaymentStatus.VERIFIED || o.status === PaymentStatus.FLAGGED
  return prisma.payment.create({
    data: {
      bookingId,
      paymentType: o.type,
      method: o.method,
      amount: o.amount,
      status: o.status,
      referenceNumber: o.ref,
      proofStoragePath: o.screenshot ? `seed/demo-proof-${randomUUID().slice(0, 8)}.png` : undefined,
      installmentId: o.installmentId,
      submittedAt: o.at,
      createdAt: o.at,
      verifiedById: reviewed ? id("coordinator") : undefined,
      verifiedAt: reviewed ? (o.reviewedAt ?? o.at) : undefined,
      verificationNote: o.note,
    },
  })
}

const verifiedDeposit = (bookingId: string, amount: number, at: Date, method: PaymentMethod = PaymentMethod.GCASH) =>
  mkPayment(bookingId, { type: PaymentType.DEPOSIT, method, amount, status: PaymentStatus.VERIFIED, at, ref: `DEP-${randomUUID().slice(0, 6)}`, note: "Deposit confirmed." })

async function assign(bookingId: string, who: Who, opts: { backup?: boolean; role?: StaffTaskRole } = {}) {
  return prisma.staffAssignment.create({
    data: { bookingId, coordinatorId: id(who), taskRole: opts.role ?? StaffTaskRole.LOGISTICS, isBackup: opts.backup ?? false },
  })
}

async function vend(bookingId: string, cat: VendorCategory, o: { contacted?: boolean; confirmed?: boolean; quote?: number; note?: string } = {}) {
  const vendorId = vendorByCat[cat]
  if (!vendorId) { console.log(`     (no ${cat} vendor in the directory — skipped)`); return }
  return prisma.bookingVendor.create({
    data: {
      bookingId, vendorId, category: cat,
      contactedAt: o.contacted || o.confirmed ? hoursAgo(72) : null,
      confirmedAt: o.confirmed ? hoursAgo(48) : null,
      quotationAmount: o.quote,
      quotationNote: o.note,
    },
  })
}

// ── Reset ────────────────────────────────────────────────────────

async function reset() {
  const where = { booking: { staffNote: { startsWith: "[seed:reports" } } }
  const p = await prisma.payment.deleteMany({ where })
  const i = await prisma.installment.deleteMany({ where })
  const b = await prisma.booking.deleteMany({ where: { staffNote: { startsWith: "[seed:reports" } } }) // vendors + staff cascade
  console.log(`  🧹  removed ${b.count} bookings, ${p.count} payments, ${i.count} installments from a previous run`)
}

// ── Scenarios ────────────────────────────────────────────────────

async function scenarios() {
  console.log("\n🎯  Risk scenarios\n")

  // S1 — proof waiting 30 h
  const s1 = await mkBooking({ client: "anna", type: EventType.WEDDING, date: day(100), status: BookingStatus.PENDING, guests: 120, price: 97_750, provincial: true, plan: PaymentPlan.FULL, depositAmount: 20_000, depositDueDate: day(3), label: "S1-proof-30h" })
  await mkPayment(s1.id, { type: PaymentType.DEPOSIT, method: PaymentMethod.GCASH, amount: 20_000, status: PaymentStatus.SUBMITTED, at: hoursAgo(30), ref: "GC-S1-0001", screenshot: true })
  console.log("  ✅  S1   proof awaiting verification 30h")

  // S1b — proof waiting 80 h
  const s1b = await mkBooking({ client: "ben", type: EventType.DEBUT, date: day(105), status: BookingStatus.PENDING, guests: 100, price: 65_000, plan: PaymentPlan.FULL, depositAmount: 18_000, depositDueDate: day(2), label: "S1b-proof-80h" })
  await mkPayment(s1b.id, { type: PaymentType.DEPOSIT, method: PaymentMethod.CHEQUE, amount: 18_000, status: PaymentStatus.SUBMITTED, at: hoursAgo(80), ref: "CHQ-S1B-77" })
  console.log("  ✅  S1b  proof awaiting verification 80h (escalated)")

  // S2 — flagged 9 days ago, never resubmitted
  const s2 = await mkBooking({ client: "anna", type: EventType.BIRTHDAY, date: day(110), status: BookingStatus.PENDING, guests: 60, price: 30_000, plan: PaymentPlan.FULL, depositAmount: 9_000, depositDueDate: day(10), label: "S2-flagged-unresolved" })
  await mkPayment(s2.id, { type: PaymentType.DEPOSIT, method: PaymentMethod.MAYA, amount: 9_000, status: PaymentStatus.FLAGGED, at: hoursAgo(9 * 24 + 2), reviewedAt: hoursAgo(9 * 24), ref: "MY-S2-0009", note: "Reference number does not match the amount." })
  console.log("  ✅  S2   flagged 9 days ago, no resubmission")

  // S2b — flagged, then corrected and verified (must NOT be reported)
  const s2b = await mkBooking({ client: "ben", type: EventType.WEDDING, date: day(112), status: BookingStatus.CONFIRMED, guests: 40, price: 85_000, plan: PaymentPlan.FULL, depositAmount: 25_000, depositVerifiedAt: hoursAgo(5 * 24), label: "S2b-flag-resolved" })
  await mkPayment(s2b.id, { type: PaymentType.DEPOSIT, method: PaymentMethod.BANK_TRANSFER, amount: 25_000, status: PaymentStatus.FLAGGED, at: hoursAgo(6 * 24 + 2), reviewedAt: hoursAgo(6 * 24), ref: "BT-S2B-1", note: "Blurry screenshot." })
  await mkPayment(s2b.id, { type: PaymentType.DEPOSIT, method: PaymentMethod.BANK_TRANSFER, amount: 25_000, status: PaymentStatus.VERIFIED, at: hoursAgo(5 * 24 + 4), reviewedAt: hoursAgo(5 * 24), ref: "BT-S2B-2", note: "Corrected proof accepted." })
  console.log("  ✅  S2b  flagged → corrected → verified (should raise nothing)")

  // S3 — deposit overdue
  await mkBooking({ client: "anna", type: EventType.DEBUT, date: day(120), status: BookingStatus.PENDING, guests: 150, price: 74_750, provincial: true, plan: PaymentPlan.FULL, depositAmount: 25_000, depositDueDate: day(-4), label: "S3-deposit-overdue" })
  console.log("  ✅  S3   deposit due 4 days ago, nothing submitted")

  // S4 — installment overdue (no proof waiting)
  const s4 = await mkBooking({ client: "ben", type: EventType.WEDDING, date: day(70), status: BookingStatus.CONFIRMED, guests: 120, price: 150_000, plan: PaymentPlan.INSTALLMENT, depositAmount: 45_000, depositVerifiedAt: hoursAgo(40 * 24), label: "S4-installment-overdue" })
  await verifiedDeposit(s4.id, 45_000, hoursAgo(41 * 24), PaymentMethod.BANK_TRANSFER)
  await prisma.installment.create({ data: { bookingId: s4.id, order: 1, dueDate: day(-6), amount: 52_500, status: InstallmentStatus.UNPAID, note: "1st installment" } })
  await prisma.installment.create({ data: { bookingId: s4.id, order: 2, dueDate: day(30), amount: 52_500, status: InstallmentStatus.UNPAID, note: "Final installment" } })
  console.log("  ✅  S4   installment #1 due 6 days ago, unpaid")

  // S5 — full balance overdue
  const s5 = await mkBooking({ client: "anna", type: EventType.CORPORATE, date: day(75), status: BookingStatus.CONFIRMED, guests: 80, price: 50_000, plan: PaymentPlan.FULL, depositAmount: 15_000, fullPaymentDueDate: day(-2), depositVerifiedAt: hoursAgo(30 * 24), label: "S5-balance-overdue" })
  await verifiedDeposit(s5.id, 15_000, hoursAgo(31 * 24), PaymentMethod.CASH)
  console.log("  ✅  S5   full balance due 2 days ago, unpaid")

  // S6 — imminent, understaffed, vendor gap
  const s6 = await mkBooking({ client: "ben", type: EventType.DEBUT, date: day(5), status: BookingStatus.CONFIRMED, guests: 160, price: 65_000, plan: PaymentPlan.FULL, depositAmount: 20_000, depositVerifiedAt: hoursAgo(20 * 24), vendorCategories: [VendorCategory.PHOTOGRAPHY, VendorCategory.CATERING], label: "S6-imminent-gaps" })
  await verifiedDeposit(s6.id, 20_000, hoursAgo(21 * 24))
  for (const w of ["coordinator2", "coordinator3", "coordinator4"] as const) await assign(s6.id, w)
  await vend(s6.id, VendorCategory.PHOTOGRAPHY, { confirmed: true, quote: 25_000, note: "Full-day coverage" })
  await vend(s6.id, VendorCategory.CATERING, { contacted: true })
  console.log("  ✅  S6   in 5 days: 3 of 8 coordinators, caterer unconfirmed")

  // S7 — imminent but fully covered (no risk)
  const s7 = await mkBooking({ client: "anna", type: EventType.BIRTHDAY, date: day(20), status: BookingStatus.CONFIRMED, guests: 40, price: 30_000, plan: PaymentPlan.FULL, depositAmount: 9_000, depositVerifiedAt: hoursAgo(15 * 24), vendorCategories: [VendorCategory.FLORALS, VendorCategory.PHOTOGRAPHY], label: "S7-covered" })
  await verifiedDeposit(s7.id, 9_000, hoursAgo(16 * 24), PaymentMethod.MAYA)
  for (const w of ["coordinator", "coordinator2", "coordinator3", "coordinator4"] as const) await assign(s7.id, w)
  await vend(s7.id, VendorCategory.FLORALS, { confirmed: true, quote: 15_000, note: "Centerpieces x6" })
  await vend(s7.id, VendorCategory.PHOTOGRAPHY, { confirmed: true, quote: 22_500 })
  console.log("  ✅  S7   in 20 days: fully staffed + covered (should raise nothing)")

  // S8 — same coordinator on two PENDING events, same date
  const s8a = await mkBooking({ client: "anna", type: EventType.WEDDING, date: day(80), status: BookingStatus.PENDING, guests: 100, price: 85_000, label: "S8a-conflict" })
  const s8b = await mkBooking({ client: "ben", type: EventType.WEDDING, date: day(80), status: BookingStatus.PENDING, guests: 100, price: 85_000, label: "S8b-conflict" })
  await assign(s8a.id, "coordinator4")
  await assign(s8b.id, "coordinator4")
  console.log("  ✅  S8   Paolo Mendoza on two pending events on one date")

  // S9 — cancellation requested 100 h ago
  const s9 = await mkBooking({ client: "ben", type: EventType.CORPORATE, date: day(85), status: BookingStatus.CANCELLATION_REQUESTED, guests: 90, price: 50_000, plan: PaymentPlan.FULL, depositAmount: 15_000, depositVerifiedAt: hoursAgo(25 * 24), cancellationRequestedAt: hoursAgo(100), cancellationReason: "Venue changed; company needs to cancel.", label: "S9-cancellation" })
  await verifiedDeposit(s9.id, 15_000, hoursAgo(26 * 24))
  console.log("  ✅  S9   cancellation requested 100h ago")

  // S10 — two CONFIRMED on one date. Since Module 9 the DATABASE refuses this (partial unique index), so this
  // scenario now only exists on databases WITHOUT the index; otherwise it is skipped and cleaned up.
  let s10aId: string | null = null
  try {
    const s10a = await mkBooking({ client: "anna", type: EventType.DEBUT, date: day(95), status: BookingStatus.CONFIRMED, guests: 80, price: 65_000, plan: PaymentPlan.FULL, depositAmount: 20_000, depositVerifiedAt: hoursAgo(10 * 24), label: "S10a-double-confirmed" })
    s10aId = s10a.id
    await verifiedDeposit(s10a.id, 20_000, hoursAgo(11 * 24))
    const s10b = await mkBooking({ client: "ben", type: EventType.DEBUT, date: day(95), status: BookingStatus.CONFIRMED, guests: 80, price: 65_000, plan: PaymentPlan.FULL, depositAmount: 20_000, depositVerifiedAt: hoursAgo(9 * 24), label: "S10b-double-confirmed" })
    await verifiedDeposit(s10b.id, 20_000, hoursAgo(10 * 24))
    console.log("  ⚠️   S10  two CONFIRMED events on one date (this database has NO one-per-date index)")
  } catch {
    if (s10aId) {
      await prisma.payment.deleteMany({ where: { bookingId: s10aId } })
      await prisma.booking.delete({ where: { id: s10aId } })
    }
    console.log("  ℹ️   S10  skipped — the database refuses two confirmed events on one date (Module 9 index). Good.")
  }

  // S11 — CONFIRMED without a verified deposit (deliberate rule violation)
  await mkBooking({ client: "ben", type: EventType.BIRTHDAY, date: day(125), status: BookingStatus.CONFIRMED, guests: 60, price: 30_000, plan: PaymentPlan.FULL, depositAmount: 9_000, label: "S11-no-deposit" })
  console.log("  ⚠️   S11  CONFIRMED with no verified deposit (intentional rule violation)")
}

// ── History (completed / cancelled events for trends, collections) ─

async function history() {
  console.log("\n📚  History (past events for booking / payment / staff reports)\n")
  const methods = [PaymentMethod.GCASH, PaymentMethod.MAYA, PaymentMethod.BANK_TRANSFER, PaymentMethod.CASH]
  const types = [EventType.WEDDING, EventType.DEBUT, EventType.CORPORATE, EventType.BIRTHDAY]
  const prices: Record<string, number> = { WEDDING: 85_000, DEBUT: 65_000, CORPORATE: 50_000, BIRTHDAY: 30_000 }
  const staffed: { id: string }[] = []

  for (let i = 0; i < 14; i++) {
    const type = types[i % 4]
    const price = prices[type]
    const date = day(-20 - i * 14)                       // one event every two weeks, going back
    const cancelled = i === 5 || i === 10
    const b = await mkBooking({
      client: i % 2 === 0 ? "anna" : "ben", type, date,
      status: cancelled ? BookingStatus.CANCELLED : BookingStatus.CONFIRMED,
      guests: [40, 90, 180][i % 3], price, plan: PaymentPlan.FULL,
      depositAmount: Math.round(price * 0.3), fullPaymentDueDate: addDays(date, -14),
      depositVerifiedAt: cancelled ? undefined : addDays(date, -60),
      cancellationReason: cancelled ? "Client postponed indefinitely" : undefined,
      createdAt: addDays(date, -75),
      label: `H${String(i + 1).padStart(2, "0")}-${cancelled ? "cancelled" : "completed"}`,
    })
    const depAt = new Date(addDays(date, -60).getTime() + 3 * 3_600_000)
    const method = methods[i % 4]
    // Cheque is accepted for deposits only — use it for one deposit, never for balances.
    await verifiedDeposit(b.id, Math.round(price * 0.3), depAt, i === 3 ? PaymentMethod.CHEQUE : method)
    if (!cancelled) {
      await mkPayment(b.id, {
        type: PaymentType.FULL_BALANCE, method: methods[(i + 1) % 4], amount: price - Math.round(price * 0.3),
        status: PaymentStatus.VERIFIED, at: new Date(addDays(date, -20).getTime() + 5 * 3_600_000),
        ref: `BAL-H${i + 1}`, screenshot: i % 2 === 0, note: "Balance confirmed.",
      })
    }
    if (!cancelled && i < 6) staffed.push({ id: b.id })
  }

  // A few past events with staff so the staff report shows compliant / understaffed rows
  const pool: Who[] = ["coordinator", "coordinator2", "coordinator3", "coordinator4"]
  for (const s of staffed) {
    const guests = (await prisma.booking.findUnique({ where: { id: s.id }, select: { guestCount: true } }))!.guestCount
    const count = Math.min(guests <= 50 ? 4 : 3, pool.length)
    for (let k = 0; k < count; k++) await assign(s.id, pool[k])
  }
  console.log("  ✅  14 past bookings (2 cancelled), payments across GCash / Maya / bank / cash / cheque, some staffed")
}

// ── Audit entries ────────────────────────────────────────────────

async function auditEntries() {
  console.log("\n📝  Audit-trail entries (hash-chained via logAction)\n")
  const rows: Parameters<typeof logAction>[0][] = [
    { userId: id("admin"), action: "LOGIN", module: "AUTH", description: "Admin signed in" },
    { userId: id("anna"),  action: "CREATE", module: "BOOKING", description: 'Client "Anna Reyes" submitted a booking request' },
    { userId: id("coordinator"), action: "VERIFY", module: "PAYMENT", description: 'COORDINATOR "Maria Santos" verified deposit' },
    { userId: id("coordinator"), action: "UPDATE", module: "PAYMENT", description: 'COORDINATOR "Maria Santos" flagged deposit payment' },
    { userId: id("admin"), action: "CONFIRM", module: "BOOKING", description: 'ADMIN "System Administrator" confirmed booking' },
    { userId: id("admin"), action: "CREATE", module: "VENDOR", description: 'ADMIN "System Administrator" assigned vendor to booking' },
    { userId: id("admin"), action: "CREATE", module: "STAFF_SCHEDULE", description: 'ADMIN "System Administrator" assigned coordinator to booking' },
    { userId: id("coordinator2"), action: "CREATE", module: "STAFF_SCHEDULE", description: 'COORDINATOR "James Villanueva" assigned coordinator to booking' },
    { userId: id("ben"), action: "CREATE", module: "PAYMENT", description: 'Client "Ben Torres" submitted a payment' },
    { userId: id("ben"), action: "UPDATE", module: "BOOKING", description: 'Client "Ben Torres" updated their booking' },
    { userId: id("admin"), action: "DECLINE", module: "BOOKING", description: 'ADMIN "System Administrator" declined a booking request' },
    { userId: id("admin"), action: "VIEW", module: "REPORT", description: "System Administrator viewed the audit trail" },
    { userId: id("coordinator"), action: "LOGOUT", module: "AUTH", description: "Coordinator signed out" },
    { userId: id("admin"), action: "EXPORT", module: "REPORT", description: "ADMIN exported the Audit trail report as CSV (no filters)" },
  ]
  for (const r of rows) await logAction(r)

  for (let n = 1; n <= 4; n++) {
    await logAction({
      userId: id(n % 2 ? "coordinator" : "ben"),
      action: n % 2 ? "VERIFY" : "CREATE",
      module: n % 2 ? "PAYMENT" : "BOOKING",
      description: n % 2 ? "Payment verification failed — payment was already verified" : "Booking request rejected — date already confirmed",
      status: "FAILURE",
      metadata: { seed: TAG, attempt: n },
    })
  }
  console.log(`  ✅  ${rows.length} normal entries + 4 FAILURE entries`)
}

// ── Bulk (performance) ───────────────────────────────────────────

async function bulk(n: number) {
  console.log(`\n🏋️  Bulk: ${n} past bookings, ~${n * 1.5} payments (NFR-05 performance dataset)\n`)
  const types = [EventType.WEDDING, EventType.DEBUT, EventType.CORPORATE, EventType.BIRTHDAY]
  const methods = [PaymentMethod.GCASH, PaymentMethod.MAYA, PaymentMethod.BANK_TRANSFER, PaymentMethod.CASH]
  const bookings: any[] = []
  const payments: any[] = []

  for (let i = 0; i < n; i++) {
    const type = types[i % 4]
    const price = [85_000, 65_000, 50_000, 30_000][i % 4]
    const date = day(-2 - i)                                   // unique date per booking, all in the past
    const roll = i % 20
    const status = roll < 15 ? BookingStatus.CONFIRMED : roll < 18 ? BookingStatus.CANCELLED : BookingStatus.PENDING
    const bookingId = randomUUID()
    bookings.push({
      id: bookingId, clientId: id(i % 2 ? "ben" : "anna"), packageId: pkgByType[type]!, eventType: type,
      eventDate: date, venue: `Bulk venue ${i}`, guestCount: 30 + (i * 7) % 220, clientPhone: "09170000000",
      agreedPrice: price, status, paymentPlan: PaymentPlan.FULL, depositAmount: Math.round(price * 0.3),
      cancellationReason: status === BookingStatus.CANCELLED ? "Bulk seed" : null,
      staffNote: `${BULK_TAG} #${i}`, createdAt: addDays(date, -60),
    })
    // Only CONFIRMED bookings carry payments. (Old PENDING bookings with an unverified proof would be
    // — correctly — flagged as risks by the monitoring layer, drowning the demo scenarios.)
    if (status !== BookingStatus.CONFIRMED) continue
    const dep = Math.round(price * 0.3)
    const at = addDays(date, -55)
    const at2 = addDays(date, -18)
    payments.push(
      {
        id: randomUUID(), bookingId, paymentType: PaymentType.DEPOSIT, method: methods[i % 4], amount: dep,
        status: PaymentStatus.VERIFIED, referenceNumber: `BULK-${i}`, submittedAt: at, createdAt: at,
        verifiedById: id("coordinator"), verifiedAt: at,
      },
      {
        id: randomUUID(), bookingId, paymentType: PaymentType.FULL_BALANCE, method: methods[(i + 1) % 4], amount: price - dep,
        status: PaymentStatus.VERIFIED, referenceNumber: `BULKB-${i}`, submittedAt: at2, createdAt: at2,
        verifiedById: id("coordinator"), verifiedAt: at2,
      },
    )
  }
  for (let k = 0; k < bookings.length; k += 1000) await prisma.booking.createMany({ data: bookings.slice(k, k + 1000) })
  for (let k = 0; k < payments.length; k += 1000) await prisma.payment.createMany({ data: payments.slice(k, k + 1000) })
  console.log(`  ✅  ${bookings.length} bookings, ${payments.length} payments`)
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required")
  console.log("\n🌱  Module 8 report seed…\n")

  await reset()
  if (RESET_ONLY) { console.log("\n✨  Reset complete.\n"); return }

  await loadRefs()
  await scenarios()
  await history()
  await auditEntries()
  if (BULK > 0) await bulk(BULK)

  console.log("\n✨  Done. Open /staff/admin (dashboard) — the risk panel should be populated.\n")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
