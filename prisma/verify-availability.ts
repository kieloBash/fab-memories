// prisma/verify-availability.ts
/**
 * Coordinator availability (B-04): marking a day unavailable, and that day blocking assignment with no override.
 *   npx tsx prisma/verify-availability.ts
 */
import "dotenv/config"
import { addUnavailableDay, getUnavailableDays, isCoordinatorUnavailable, removeUnavailableDay } from "@/features/availability/availability.query"
import { createStaffAssignment } from "@/features/staff-assignments/staff-assignments.query"
import { prisma } from "@/lib/prisma"

const TAG = "[test:availability]"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log(`  ✅  ${n}`) } else { fails.push(n); console.log(`  ❌  ${n}${d !== undefined ? `\n        → ${JSON.stringify(d)}` : ""}`) } }
const section = (t: string) => console.log(`\n── ${t}`)

async function cleanup(coordinatorId: string) {
  await prisma.staffAssignment.deleteMany({ where: { booking: { staffNote: TAG } } })
  await prisma.booking.deleteMany({ where: { staffNote: TAG } })
  await prisma.coordinatorUnavailability.deleteMany({ where: { coordinatorId } })
}

async function main() {
  const coordinator = await prisma.user.findFirst({ where: { role: "COORDINATOR" } })
  const otherCoordinator = await prisma.user.findFirst({ where: { role: "COORDINATOR", id: { not: coordinator?.id } } })
  const client = await prisma.user.findFirst({ where: { role: "CLIENT" } })
  const pkg = await prisma.package.findFirst()
  if (!coordinator || !client || !pkg) throw new Error("Run the base seed first.")
  await cleanup(coordinator.id)

  section("Marking and listing unavailable days")
  const d1 = await addUnavailableDay(coordinator.id, { date: "2048-01-10", reason: "Family trip" })
  check("a day can be marked with a reason", d1.date === "2048-01-10" && d1.reason === "Family trip")
  check("no assignment yet → no conflict flag", d1.conflictsWithAssignment === false)
  const list = await getUnavailableDays(coordinator.id)
  check("it shows up in the list", list.some((d) => d.id === d1.id))

  const again = await addUnavailableDay(coordinator.id, { date: "2048-01-10", reason: "Updated reason" })
  check("marking the SAME day again is idempotent (same row, reason updated)", again.id === d1.id && again.reason === "Updated reason")
  const listAfter = await getUnavailableDays(coordinator.id)
  check("…and does not create a duplicate row", listAfter.filter((d) => d.date === "2048-01-10").length === 1)

  check("isCoordinatorUnavailable is true for the marked day", await isCoordinatorUnavailable(coordinator.id, new Date("2048-01-10T00:00:00Z")))
  check("…and false for a day not marked", !(await isCoordinatorUnavailable(coordinator.id, new Date("2048-01-11T00:00:00Z"))))
  check("…and false for a DIFFERENT coordinator on the same date", otherCoordinator ? !(await isCoordinatorUnavailable(otherCoordinator.id, new Date("2048-01-10T00:00:00Z"))) : true)

  section("Assignment is refused, with no override, on an unavailable date")
  const booking = await prisma.booking.create({ data: {
    clientId: client.id, packageId: pkg.id, eventType: "OTHER", eventDate: new Date("2048-01-10T00:00:00Z"), venue: "x",
    guestCount: 10, clientPhone: "0", agreedPrice: 5000, paymentPlan: "FULL", depositAmount: 1000, status: "CONFIRMED", staffNote: TAG,
  } })
  check("the route-level guard would see this as unavailable", await isCoordinatorUnavailable(coordinator.id, booking.eventDate))
  // createStaffAssignment() itself does not check (the check lives in the route, ahead of it — see verify-staff-availability-routes.ts);
  // this proves the query the route relies on gives the right answer for the exact date it will check.

  section("Overlap with an EXISTING assignment is a warning, not a block")
  const booked = await prisma.booking.create({ data: {
    clientId: client.id, packageId: pkg.id, eventType: "OTHER", eventDate: new Date("2048-02-01T00:00:00Z"), venue: "x",
    guestCount: 10, clientPhone: "0", agreedPrice: 5000, paymentPlan: "FULL", depositAmount: 1000, status: "CONFIRMED", staffNote: TAG,
  } })
  await createStaffAssignment(booked.id, { coordinatorId: coordinator.id, taskRole: "LEAD_COORDINATOR" })
  const warned = await addUnavailableDay(coordinator.id, { date: "2048-02-01" })
  check("marking a day that already has an assignment SUCCEEDS (not blocked)", !!warned.id)
  check("…but is flagged as conflicting, for the UI to warn about", warned.conflictsWithAssignment === true)

  section("Removing a day")
  const removed = await removeUnavailableDay(d1.id, coordinator.id)
  check("the owner can remove their own entry", removed === true)
  check("…and it is gone from the list", !(await getUnavailableDays(coordinator.id)).some((d) => d.id === d1.id))
  const removedAgain = await removeUnavailableDay(d1.id, coordinator.id)
  check("removing it again is a harmless no-op (false, not an error)", removedAgain === false)
  if (otherCoordinator) {
    const theirs = await addUnavailableDay(otherCoordinator.id, { date: "2048-03-01" })
    const stolen = await removeUnavailableDay(theirs.id, coordinator.id)
    check("a DIFFERENT coordinator cannot remove someone else's entry (scoped by coordinatorId)", stolen === false)
    await removeUnavailableDay(theirs.id, otherCoordinator.id)
  }

  await cleanup(coordinator.id)
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch(async (e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
