// test-harness/verify-availability-routes.ts
//
// /api/staff/availability(/[id]) — a coordinator's own availability, and its enforcement inside
// POST /api/bookings/[id]/staff (the actual assignment gate).
import "dotenv/config"
import { POST as assignPOST } from "@/app/api/bookings/[bookingId]/staff/route"
import { DELETE as availabilityDELETE } from "@/app/api/staff/availability/[id]/route"
import { GET as availabilityGET, POST as availabilityPOST } from "@/app/api/staff/availability/route"
import { prisma } from "@/lib/prisma"

const TAG = "[test:availability-routes]"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log("  ✅ ", n) } else { fails.push(n); console.log("  ❌ ", n, d !== undefined ? "→ " + JSON.stringify(d) : "") } }
const section = (t: string) => console.log(`\n── ${t}`)
const as = (role?: string, user?: string) => { role ? (process.env.TEST_ROLE = role) : delete process.env.TEST_ROLE; user ? (process.env.TEST_USER = user) : delete process.env.TEST_USER }
const json = (method: string, body?: unknown) => new Request("http://x", { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })
const P = (id: string) => ({ params: Promise.resolve({ id }) })
const body = async (r: Response) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }) as any

async function cleanup(coordinatorId?: string) {
  await prisma.staffAssignment.deleteMany({ where: { booking: { staffNote: TAG } } })
  await prisma.booking.deleteMany({ where: { staffNote: TAG } })
  if (coordinatorId) await prisma.coordinatorUnavailability.deleteMany({ where: { coordinatorId } })
}

async function main() {
  const coordinator = await prisma.user.findUnique({ where: { username: "coordinator" } })
  const client = await prisma.user.findFirst({ where: { role: "CLIENT" } })
  const pkg = await prisma.package.findFirst()
  if (!coordinator || !client || !pkg) throw new Error("Run the base seed first.")
  await cleanup(coordinator.id)

  section("POST/GET/DELETE /api/staff/availability — real HTTP")
  as("COORDINATOR", "coordinator")
  let r = await body(await availabilityPOST(json("POST", { date: "2049-01-10", reason: "Leave" })))
  check("mark a day → 201", r.status === 201 && r.date === "2049-01-10", r)
  const dayId: string = r.id
  const listRes = await availabilityGET()
  const listBody = await listRes.json()
  check("shows in my own list", listRes.status === 200 && Array.isArray(listBody) && listBody.some((d: any) => d.id === dayId), listBody)

  as("ADMIN", "admin")
  check("an ADMIN cannot use the coordinator-only availability endpoint (403)", (await availabilityGET()).status === 403)
  as("COORDINATOR", "coordinator")
  r = await body(await availabilityPOST(json("POST", { date: "not-a-date" })))
  check("an invalid date format → 422", r.status === 422, r)

  r = await body(await availabilityDELETE(json("DELETE"), P(dayId)))
  check("removing my own day → 200", r.status === 200, r)
  r = await body(await availabilityDELETE(json("DELETE"), P(dayId)))
  check("removing it again → 404 (already gone)", r.status === 404, r)

  section("The actual assignment gate — POST /api/bookings/[id]/staff refuses an unavailable coordinator")
  await availabilityPOST(json("POST", { date: "2050-06-15" }))
  const booking = await prisma.booking.create({ data: {
    clientId: client.id, packageId: pkg.id, eventType: "OTHER", eventDate: new Date("2050-06-15T00:00:00Z"), venue: "x",
    guestCount: 10, clientPhone: "0", agreedPrice: 5000, paymentPlan: "FULL", depositAmount: 1000, status: "CONFIRMED", staffNote: TAG,
  } })
  as("ADMIN", "admin")
  r = await body(await assignPOST(json("POST", { coordinatorId: coordinator.id, taskRole: "LEAD_COORDINATOR" }), { params: Promise.resolve({ bookingId: booking.id }) }))
  check("assigning them on their unavailable date → 409 COORDINATOR_UNAVAILABLE", r.status === 409 && r.code === "COORDINATOR_UNAVAILABLE", r)
  check("…the message says why", /unavailable/i.test(r.error ?? ""), r.error)
  check("…no assignment was actually created", (await prisma.staffAssignment.count({ where: { bookingId: booking.id } })) === 0)
  check("…and the blocked attempt is itself audited (FAILURE)", (await prisma.auditLog.count({ where: { module: "STAFF_SCHEDULE", status: "FAILURE", metadata: { path: ["bookingId"], equals: booking.id } } })) === 1)

  const freeBooking = await prisma.booking.create({ data: {
    clientId: client.id, packageId: pkg.id, eventType: "OTHER", eventDate: new Date("2050-06-20T00:00:00Z"), venue: "x",
    guestCount: 10, clientPhone: "0", agreedPrice: 5000, paymentPlan: "FULL", depositAmount: 1000, status: "CONFIRMED", staffNote: TAG,
  } })
  r = await body(await assignPOST(json("POST", { coordinatorId: coordinator.id, taskRole: "LEAD_COORDINATOR" }), { params: Promise.resolve({ bookingId: freeBooking.id }) }))
  check("the SAME coordinator on a FREE date → 201, assignment succeeds", r.status === 201, r)

  await cleanup(coordinator.id)
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) }).finally(() => prisma.$disconnect())
