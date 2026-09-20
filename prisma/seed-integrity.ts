// prisma/seed-integrity.ts
/**
 * Module 9 demo data — ADDITIVE. Run AFTER the main seed (prisma/seed.ts).
 *
 *   npx tsx prisma/seed-integrity.ts               # create the scenarios
 *   npx tsx prisma/seed-integrity.ts --reset-only  # remove them
 *
 * Bookings are tagged Booking.staffNote = "[seed:integrity] Ix-…". Each one sets up a click-through test:
 *
 *   I1  CONFIRMED (deposit verified) on day +130 ............ HOLDS the date
 *   I2  PENDING, deposit SUBMITTED, SAME date as I1 ........ Verify → BLOCKED "another booking holds this date";
 *                                                            the payment stays SUBMITTED
 *   I3  PENDING, no deposit at all, day +135 ................ Confirm → BLOCKED "verified deposit required"
 *   I4  CANCELLATION_REQUESTED (deposit verified), day +140 . its date is HELD while the request is open
 *   I4b PENDING, deposit SUBMITTED, SAME date as I4 ......... Verify → BLOCKED (date held by the undecided request)
 *   I5  PENDING, deposit SUBMITTED, FREE date +145 .......... Verify → succeeds: booking CONFIRMED + ONE audit entry
 */
import "dotenv/config"
import { PrismaClient } from "@/app/generated/prisma/client"
import { addDays, manilaToday } from "@/features/reports/reports.dates"
import { PrismaPg } from "@prisma/adapter-pg"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
const TAG = "[seed:integrity]"
const RESET_ONLY = process.argv.includes("--reset-only")
const day = (n: number) => addDays(manilaToday(), n)
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000)

async function reset() {
  const where = { booking: { staffNote: { startsWith: TAG } } }
  const p = await prisma.payment.deleteMany({ where })
  const b = await prisma.booking.deleteMany({ where: { staffNote: { startsWith: TAG } } })
  console.log(`  🧹  removed ${b.count} bookings, ${p.count} payments from a previous run`)
}

async function main() {
  console.log("\n🌱  Module 9 integrity seed…\n")
  await reset()
  if (RESET_ONLY) { console.log("\n✨  Reset complete.\n"); return }

  const anna = await prisma.user.findUnique({ where: { username: "client_anna" } })
  const ben = await prisma.user.findUnique({ where: { username: "client_ben" } })
  const staff = await prisma.user.findUnique({ where: { username: "coordinator" } })
  const pkg = await prisma.package.findFirst({ where: { eventType: "WEDDING" } }) ?? await prisma.package.findFirst()
  if (!anna || !ben || !staff || !pkg) throw new Error("Run the main seed (prisma/seed.ts) first.")

  const mk = (label: string, clientId: string, date: Date, status: "PENDING" | "CONFIRMED" | "CANCELLATION_REQUESTED", extra: object = {}) =>
    prisma.booking.create({
      data: {
        clientId, packageId: pkg.id, eventType: "WEDDING", eventDate: date, venue: `${label} venue, Metro Manila`, guestCount: 80,
        clientPhone: "09170000000", agreedPrice: 85_000, paymentPlan: "FULL", depositAmount: 25_000, depositDueDate: day(3),
        status, staffNote: `${TAG} ${label}`, ...extra,
      },
    })
  const deposit = (bookingId: string, status: "SUBMITTED" | "VERIFIED", ref: string, ago = 2) =>
    prisma.payment.create({
      data: {
        bookingId, paymentType: "DEPOSIT", method: "GCASH", amount: 25_000, status, referenceNumber: ref,
        submittedAt: hoursAgo(ago), createdAt: hoursAgo(ago),
        ...(status === "VERIFIED" ? { verifiedById: staff.id, verifiedAt: hoursAgo(ago - 1), verificationNote: "Deposit confirmed." } : {}),
      },
    })

  const i1 = await mk("I1-holds-the-date", anna.id, day(130), "CONFIRMED", { depositVerifiedAt: hoursAgo(48), depositVerifiedById: staff.id })
  await deposit(i1.id, "VERIFIED", "INT-I1", 50)
  const i2 = await mk("I2-blocked-verify", ben.id, day(130), "PENDING")
  await deposit(i2.id, "SUBMITTED", "INT-I2")
  console.log("  ✅  I1  CONFIRMED holder on +130  ·  I2  PENDING + submitted deposit on the SAME date  → Verify must be blocked")

  await mk("I3-no-deposit", anna.id, day(135), "PENDING")
  console.log("  ✅  I3  PENDING with no deposit at all (+135)  → Confirm must be blocked")

  const i4 = await mk("I4-cancellation-pending", ben.id, day(140), "CANCELLATION_REQUESTED",
    { depositVerifiedAt: hoursAgo(72), depositVerifiedById: staff.id, cancellationRequestedAt: hoursAgo(5), cancellationRequestReason: "Considering a different venue." })
  await deposit(i4.id, "VERIFIED", "INT-I4", 80)
  const i4b = await mk("I4b-wants-held-date", anna.id, day(140), "PENDING")
  await deposit(i4b.id, "SUBMITTED", "INT-I4B")
  console.log("  ✅  I4  CANCELLATION_REQUESTED on +140  ·  I4b PENDING + submitted deposit on the same date  → Verify must be blocked")

  const i5 = await mk("I5-clean-verify", ben.id, day(145), "PENDING")
  await deposit(i5.id, "SUBMITTED", "INT-I5")
  console.log("  ✅  I5  PENDING + submitted deposit on a FREE date (+145)  → Verify succeeds and confirms the booking")

  console.log("\n✨  Done. Sign in as admin → Payments → open the submitted deposits, or use the E2E script.\n")
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
