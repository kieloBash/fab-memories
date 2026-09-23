// prisma/seeds/04-testing.ts — manual / integration-testing scenarios (add-on seed)
/**
 * One booking parked at the START of each manual test in tests/INTEGRATION_AND_MANUAL_TEST_GUIDE.md.
 * ADDITIVE and re-runnable: every run first removes what the previous run created.
 *
 *   npx tsx prisma/seed.ts --with=testing      # create (base seed must exist)
 *   npx tsx prisma/seed.ts --reset=testing     # remove
 *
 * Bookings are tagged Booking.staffNote = "[seed:testing] Tn — …". Dates are +250…+262 days out, clear of the
 * other seeds, so confirming one never collides with the one-event-per-day rule.
 *
 *   T1  Anna  PENDING, no contract terms ................. staff set terms (guide §4.1)
 *   T2  Anna  PENDING, FULL plan, deposit SUBMITTED ...... staff verify → CONFIRMED (§4.3)
 *   T3  Ben   CONFIRMED, INSTALLMENT, 2 unpaid rows ...... client pays #1, staff verify (§4.4)
 *   T4  Ben   CANCELLATION_REQUESTED ..................... staff decline or approve (§4.7)
 *   T5  Anna  CONFIRMED, 60 guests, 1 coordinator + 1 vendor (contacted) → staffing banner, vendor brief (§4.5, §4.6)
 *   T6  Ben   PENDING, deposit FLAGGED ................... client resubmits (§4.3b)
 */
import "dotenv/config"
import { addDays, manilaToday } from "@/features/reports/reports.dates"
import { prisma, type SeedModule } from "./_shared"

const TAG = "[seed:testing]"
const day = (n: number) => addDays(manilaToday(), n)

export async function reset() {
  const bookings = await prisma.booking.findMany({ where: { staffNote: { startsWith: TAG } }, select: { id: true } })
  const ids = bookings.map((b) => b.id)
  await prisma.payment.deleteMany({ where: { bookingId: { in: ids } } })
  await prisma.installment.deleteMany({ where: { bookingId: { in: ids } } })
  await prisma.bookingVendor.deleteMany({ where: { bookingId: { in: ids } } })
  await prisma.staffAssignment.deleteMany({ where: { bookingId: { in: ids } } })
  for (const id of ids) await prisma.notification.deleteMany({ where: { link: { contains: id } } })
  const r = await prisma.booking.deleteMany({ where: { id: { in: ids } } })
  console.log(`  🧹  removed ${r.count} testing bookings from a previous run`)
}

export async function run() {
  console.log("\n🌱  Testing scenarios (T1–T6)…\n")
  await reset()

  const [anna, ben, admin, maria] = await Promise.all(
    ["client_anna", "client_ben", "admin", "coordinator"].map((username) => prisma.user.findUnique({ where: { username } })),
  )
  const pkg = (await prisma.package.findFirst({ where: { eventType: "WEDDING", isActive: true } })) ?? (await prisma.package.findFirst())
  const caterer = await prisma.vendor.findFirst({ where: { category: "CATERING", isActive: true } })
  if (!anna || !ben || !admin || !maria || !pkg) throw new Error("Run the base seed first (npx tsx prisma/seed.ts).")

  const price = Number(pkg.price)
  const booking = (label: string, clientId: string, offset: number, extra: Record<string, unknown> = {}) =>
    prisma.booking.create({
      data: {
        clientId, packageId: pkg.id, eventType: "WEDDING", eventDate: day(offset), venue: `${label} — Casa Ibarra, Tagaytay`,
        guestCount: 120, clientPhone: "09171234567", agreedPrice: price, vendorCategories: ["CATERING", "PHOTOGRAPHY"],
        staffNote: `${TAG} ${label}`, ...extra,
      },
    })
  const deposit = price >= 50_000 ? 25_000 : Math.round(price * 0.3)
  const terms = (plan: "FULL" | "INSTALLMENT") => ({
    paymentPlan: plan, depositAmount: deposit, depositDueDate: day(7), ...(plan === "FULL" ? { fullPaymentDueDate: day(200) } : {}),
  })
  const verified = { status: "VERIFIED" as const, verifiedById: admin.id, verifiedAt: new Date(), verificationNote: "Deposit confirmed." }

  // T1 — needs contract terms
  const t1 = await booking("T1 needs terms", anna.id, 250)

  // T2 — deposit waiting for verification
  const t2 = await booking("T2 deposit to verify", anna.id, 252, terms("FULL"))
  await prisma.payment.create({ data: { bookingId: t2.id, paymentType: "DEPOSIT", method: "GCASH", amount: deposit, status: "SUBMITTED", referenceNumber: "TEST-GC-0002", submittedAt: new Date() } })

  // T3 — confirmed, installment plan, nothing paid yet after the deposit
  const t3 = await booking("T3 installments", ben.id, 254, { ...terms("INSTALLMENT"), status: "CONFIRMED", depositVerifiedAt: new Date(), depositVerifiedById: admin.id })
  await prisma.payment.create({ data: { bookingId: t3.id, paymentType: "DEPOSIT", method: "MAYA", amount: deposit, referenceNumber: "TEST-MY-0003", submittedAt: new Date(), ...verified } })
  const half = Math.round(((price - deposit) / 2) * 100) / 100
  await prisma.installment.createMany({ data: [
    { bookingId: t3.id, order: 1, dueDate: day(60), amount: half },
    { bookingId: t3.id, order: 2, dueDate: day(120), amount: Math.round((price - deposit - half) * 100) / 100 },
  ] })

  // T4 — cancellation request awaiting a decision
  const t4 = await booking("T4 cancellation request", ben.id, 256, {
    ...terms("FULL"), status: "CANCELLATION_REQUESTED", depositVerifiedAt: new Date(), depositVerifiedById: admin.id,
    cancellationRequestReason: "Our venue changed its policy; we may have to cancel.", cancellationRequestedAt: new Date(),
  })
  await prisma.payment.create({ data: { bookingId: t4.id, paymentType: "DEPOSIT", method: "BANK_TRANSFER", amount: deposit, referenceNumber: "TEST-BT-0004", submittedAt: new Date(), ...verified } })

  // T5 — confirmed, under-staffed, one vendor contacted
  const t5 = await booking("T5 staffing and vendors", anna.id, 258, { ...terms("FULL"), status: "CONFIRMED", guestCount: 60, depositVerifiedAt: new Date(), depositVerifiedById: admin.id })
  await prisma.payment.create({ data: { bookingId: t5.id, paymentType: "DEPOSIT", method: "GCASH", amount: deposit, referenceNumber: "TEST-GC-0005", submittedAt: new Date(), ...verified } })
  await prisma.staffAssignment.create({ data: { bookingId: t5.id, coordinatorId: maria.id, taskRole: "LEAD_COORDINATOR", notes: "Seeded for testing" } })
  const bv = caterer
    ? await prisma.bookingVendor.create({ data: { bookingId: t5.id, vendorId: caterer.id, category: "CATERING", notes: "Agreed ₱650/head", contactedAt: new Date() } })
    : null

  // T6 — a flagged deposit the client must resubmit
  const t6 = await booking("T6 flagged deposit", ben.id, 262, terms("FULL"))
  await prisma.payment.create({ data: {
    bookingId: t6.id, paymentType: "DEPOSIT", method: "GCASH", amount: deposit, status: "FLAGGED", referenceNumber: "TEST-BLURRY",
    submittedAt: new Date(), verifiedById: admin.id, verifiedAt: new Date(), verificationNote: "Reference number not found — please resubmit.",
  } })

  const rows: [string, string, string][] = [
    ["T1", t1.id, "anna  — PENDING, needs contract terms"],
    ["T2", t2.id, "anna  — PENDING, deposit SUBMITTED"],
    ["T3", t3.id, "ben   — CONFIRMED, 2 unpaid installments"],
    ["T4", t4.id, "ben   — CANCELLATION_REQUESTED"],
    ["T5", t5.id, `anna  — CONFIRMED, 60 guests, 1 coordinator${bv ? ", caterer contacted" : " (no caterer in base seed)"}`],
    ["T6", t6.id, "ben   — PENDING, deposit FLAGGED"],
  ]
  for (const [k, id, what] of rows) console.log(`  ✅  ${k}  ${id}  ${what}`)
  if (bv) console.log(`\n  🔗  T5 vendor brief:  /vendor-brief/${t5.id}?view=${bv.id}`)
  console.log("\n✨  Done. Follow tests/INTEGRATION_AND_MANUAL_TEST_GUIDE.md.\n")
}

export const seed: SeedModule = {
  name: "testing",
  kind: "addon",
  description: "Manual-test scenarios T1–T6 (one booking parked at the start of each test in the manual test guide)",
  requires: ["base"],
  run: async () => { await run() },
  reset: async () => { await reset(); console.log("\n✨  testing data removed.\n") },
}
