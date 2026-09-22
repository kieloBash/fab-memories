// prisma/verify-booking-history.ts
/**
 * Booking status history (FR-13) — built entirely from the audit trail.
 *
 *   npx tsx prisma/verify-booking-history.ts
 */
import "dotenv/config"
import { auditedTransaction, logAction } from "@/lib/audit/log"
import { transitionBooking } from "@/features/bookings/bookings.transition"
import { getBookingHistory } from "@/features/bookings/booking-history.query"
import { prisma } from "@/lib/prisma"

const TAG = "[test:booking-history]"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log(`  ✅  ${n}`) } else { fails.push(n); console.log(`  ❌  ${n}${d !== undefined ? `\n        → ${JSON.stringify(d)}` : ""}`) } }
const section = (t: string) => console.log(`\n── ${t}`)

async function cleanup() {
  await prisma.payment.deleteMany({ where: { booking: { staffNote: TAG } } })
  await prisma.installment.deleteMany({ where: { booking: { staffNote: TAG } } })
  await prisma.booking.deleteMany({ where: { staffNote: TAG } })
}

async function main() {
  await cleanup()
  const client = await prisma.user.findFirst({ where: { role: "CLIENT" } })
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  const pkg = await prisma.package.findFirst()
  if (!client || !admin || !pkg) throw new Error("Run the base seed first.")

  section("A full lifecycle produces a clean, ordered, correctly-labelled timeline")
  const b = await prisma.booking.create({ data: {
    clientId: client.id, packageId: pkg.id, eventType: "OTHER", eventDate: new Date(Date.UTC(2044, 0, 1)), venue: "Test Venue",
    guestCount: 10, clientPhone: "0", agreedPrice: 10000, paymentPlan: "FULL", depositAmount: 3000, staffNote: TAG,
  } })
  await logAction({ userId: client.id, action: "CREATE", module: "BOOKING", description: "Booking requested", metadata: { bookingId: b.id } })
  await logAction({ userId: client.id, action: "UPDATE", module: "BOOKING", description: "Client edited booking", metadata: { bookingId: b.id, changes: { fields: ["guestCount"], values: { guestCount: 12 } } } })

  const dep = await prisma.payment.create({ data: { bookingId: b.id, paymentType: "DEPOSIT", method: "GCASH", amount: 3000, status: "SUBMITTED", submittedAt: new Date() } })
  await logAction({ userId: client.id, action: "CREATE", module: "PAYMENT", description: "Client submitted deposit proof", metadata: { paymentId: dep.id, bookingId: b.id, paymentType: "DEPOSIT" } })

  // A BLOCKED attempt must never appear in the history.
  await logAction({ userId: admin.id, action: "CONFIRM", module: "BOOKING", status: "FAILURE", description: "Blocked: could not confirm — deposit not verified", metadata: { bookingId: b.id } })

  await auditedTransaction(async (tx, audit) => {
    await tx.payment.update({ where: { id: dep.id }, data: { status: "VERIFIED", verifiedById: admin.id, verifiedAt: new Date() } })
    await transitionBooking(tx, { bookingId: b.id, to: "CONFIRMED", actorId: admin.id, depositVerifiedInTx: true })
    audit({ userId: admin.id, action: "VERIFY", module: "PAYMENT", description: "Deposit verified — booking confirmed", metadata: { paymentId: dep.id, bookingId: b.id } })
  })

  await logAction({ userId: client.id, action: "UPDATE", module: "BOOKING", description: "Cancellation requested", metadata: { bookingId: b.id, reasonProvided: true } })
  await logAction({ userId: admin.id, action: "DECLINE", module: "BOOKING", description: "Admin declined the cancellation request", metadata: { bookingId: b.id } })

  const history = await getBookingHistory(b.id)
  check("returns exactly 6 events (the FAILURE entry is excluded)", history.length === 6, history.map((e) => e.kind))
  check("events are in chronological order", history.every((e, i) => i === 0 || new Date(history[i - 1]!.at) <= new Date(e.at)))
  const kinds = history.map((e) => e.kind)
  check("kinds are: requested, edited, deposit_submitted, deposit_verified, cancellation_requested, cancellation_declined",
    JSON.stringify(kinds) === JSON.stringify(["requested", "edited", "deposit_submitted", "deposit_verified", "cancellation_requested", "cancellation_declined"]), kinds)
  check('the deposit-verify label says the booking was confirmed', history[3]!.label === "Deposit verified — booking confirmed", history[3])
  check("actor roles are recorded (CLIENT, then ADMIN where appropriate)", history[0]!.actorRole === "CLIENT" && history[3]!.actorRole === "ADMIN")
  check("no event's label contains a raw description string, an id, or a name", !history.some((e) => e.label.includes(b.id) || e.label.includes(client.fullName) || e.label.includes(admin.fullName)))

  section("Payment type disambiguation via the Payment table")
  const b2 = await prisma.booking.create({ data: {
    clientId: client.id, packageId: pkg.id, eventType: "OTHER", eventDate: new Date(Date.UTC(2044, 1, 1)), venue: "Test", guestCount: 5,
    clientPhone: "0", agreedPrice: 30000, paymentPlan: "INSTALLMENT", depositAmount: 3000, status: "CONFIRMED", staffNote: TAG,
  } })
  const sched = await prisma.installment.create({ data: { bookingId: b2.id, order: 2, amount: 5000, dueDate: new Date(), status: "UNPAID" } })
  const instPay = await prisma.payment.create({ data: { bookingId: b2.id, paymentType: "INSTALLMENT", installmentId: sched.id, method: "GCASH", amount: 5000, status: "SUBMITTED", submittedAt: new Date() } })
  await logAction({ userId: client.id, action: "CREATE", module: "PAYMENT", description: "x", metadata: { paymentId: instPay.id, bookingId: b2.id, paymentType: "INSTALLMENT" } })
  await logAction({ userId: admin.id, action: "VERIFY", module: "PAYMENT", description: "x", metadata: { paymentId: instPay.id, bookingId: b2.id } })
  const h2 = await getBookingHistory(b2.id)
  check("installment events are labelled with the installment's ORDER NUMBER, read from the Payment/Installment table", h2.some((e) => e.label === "Installment #2 recorded") && h2.some((e) => e.label === "Installment #2 verified"), h2)

  const full = await prisma.payment.create({ data: { bookingId: b2.id, paymentType: "FULL_BALANCE", method: "GCASH", amount: 25000, status: "SUBMITTED", submittedAt: new Date() } })
  await logAction({ userId: admin.id, action: "UPDATE", module: "PAYMENT", description: "flagged", metadata: { paymentId: full.id, bookingId: b2.id } })
  const h3 = await getBookingHistory(b2.id)
  check("a flagged payment is labelled using its real type (Balance), not a generic 'Payment'", h3.some((e) => e.label === "Balance flagged for review"), h3)

  section("Scoping and isolation")
  const b3 = await prisma.booking.create({ data: {
    clientId: client.id, packageId: pkg.id, eventType: "OTHER", eventDate: new Date(Date.UTC(2044, 2, 1)), venue: "Other booking",
    guestCount: 5, clientPhone: "0", agreedPrice: 10000, paymentPlan: "FULL", depositAmount: 3000, staffNote: TAG,
  } })
  await logAction({ userId: client.id, action: "CREATE", module: "BOOKING", description: "x", metadata: { bookingId: b3.id } })
  check("a booking with no history returns an empty array, not an error", (await getBookingHistory("does-not-exist")).length === 0)
  check("events for one booking never leak into another booking's history", (await getBookingHistory(b3.id)).length === 1 && (await getBookingHistory(b.id)).length === 6)

  const vendorEvent = await logAction({ userId: admin.id, action: "CREATE", module: "VENDOR", description: "vendor assigned", metadata: { bookingId: b3.id } } as any)
  check("events from other modules (VENDOR, STAFF, AUTH…) never appear in the booking timeline", (await getBookingHistory(b3.id)).length === 1)

  await cleanup()
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) }).finally(() => prisma.$disconnect())
