// prisma/verify-calendar-cancelled.ts
/**
 * Cancelled bookings show on the staffing calendar (FR-16), visibly distinct, but must NEVER count toward
 * staffing compliance or scheduling conflicts.
 *
 *   npx tsx prisma/verify-calendar-cancelled.ts
 */
import "dotenv/config"
import { checkCoordinatorConflict, getStaffingCalendarMonth } from "@/features/staff-assignments/staff-assignments.query"
import { prisma } from "@/lib/prisma"

const TAG = "[test:calendar-cancelled]"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log(`  ✅  ${n}`) } else { fails.push(n); console.log(`  ❌  ${n}${d !== undefined ? `\n        → ${JSON.stringify(d)}` : ""}`) } }

async function cleanup() {
  await prisma.staffAssignment.deleteMany({ where: { booking: { staffNote: TAG } } })
  await prisma.booking.deleteMany({ where: { staffNote: TAG } })
}

async function main() {
  await cleanup()
  const client = await prisma.user.findFirst({ where: { role: "CLIENT" } })
  const coordinator = await prisma.user.findFirst({ where: { role: "COORDINATOR" } })
  const pkg = await prisma.package.findFirst()
  if (!client || !coordinator || !pkg) throw new Error("Run the base seed first.")

  const YEAR = 2044, MONTH = 6 // July
  const day = new Date(Date.UTC(YEAR, MONTH, 15))
  const mk = (status: "CONFIRMED" | "PENDING" | "CANCELLED", guests = 80) =>
    prisma.booking.create({ data: {
      clientId: client.id, packageId: pkg.id, eventType: "OTHER", eventDate: day, venue: "x", guestCount: guests,
      clientPhone: "0", agreedPrice: 10000, paymentPlan: "FULL", depositAmount: 3000, status, staffNote: TAG,
    } })

  const cancelled = await mk("CANCELLED")
  const confirmed = await mk("CONFIRMED")
  await prisma.staffAssignment.create({ data: { bookingId: confirmed.id, coordinatorId: coordinator.id, taskRole: "LEAD_COORDINATOR", isBackup: false } })

  const month = await getStaffingCalendarMonth(YEAR, MONTH)
  const onDay = month.filter((e) => e.bookingId === cancelled.id || e.bookingId === confirmed.id)
  check("both the cancelled and the confirmed event appear on the calendar", onDay.length === 2)

  const c = month.find((e) => e.bookingId === cancelled.id)!
  check("the cancelled event carries no staffing figures", c.assignedCount === 0 && c.recommendation === null && c.isCompliant === null, c)

  const conf = month.find((e) => e.bookingId === confirmed.id)!
  check("the CONFIRMED event's own compliance is unaffected by the cancelled one sharing its date", conf.assignedCount === 1 && conf.recommendation !== null, conf)

  const conflict = await checkCoordinatorConflict(coordinator.id, day.toISOString())
  check("a coordinator scheduling conflict check never counts a CANCELLED booking", conflict.conflicts.every((c) => c.bookingId !== cancelled.id))

  const otherCoordinator = await prisma.user.findFirst({ where: { role: "COORDINATOR", id: { not: coordinator.id } } })
  if (otherCoordinator) {
    const free = await checkCoordinatorConflict(otherCoordinator.id, day.toISOString())
    check("assigning a DIFFERENT coordinator to the cancelled-only slot reports no conflict", free.hasConflict === false || free.conflicts.every((c) => c.bookingId !== cancelled.id))
  }

  await cleanup()
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) }).finally(() => prisma.$disconnect())
