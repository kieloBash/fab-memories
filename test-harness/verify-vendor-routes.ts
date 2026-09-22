// test-harness/verify-vendor-routes.ts
//
// PATCH /api/vendors/[id] and PATCH /api/bookings/[id]/vendors/[vendorId] must be TRUE partial updates.
// Drives the real route handlers (auth stubbed by run-route-tests.sh).
import "dotenv/config"
import { DELETE as vendorDELETE, PATCH as vendorPATCH } from "@/app/api/vendors/[vendorId]/route"
import { PATCH as bvPATCH } from "@/app/api/bookings/[bookingId]/vendors/[vendorId]/route"
import { prisma } from "@/lib/prisma"

const TAG = "[test:vendor-routes]"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log("  ✅ ", n) } else { fails.push(n); console.log("  ❌ ", n, d !== undefined ? "→ " + JSON.stringify(d) : "") } }
const section = (t: string) => console.log(`\n── ${t}`)
const as = (role?: string, user?: string) => { role ? (process.env.TEST_ROLE = role) : delete process.env.TEST_ROLE; user ? (process.env.TEST_USER = user) : delete process.env.TEST_USER }
const json = (method: string, body?: unknown) => new Request("http://x/api/x", { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })
const P = <T extends object>(v: T) => ({ params: Promise.resolve(v) })
const body = async (r: Response) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }) as any

async function cleanup() {
  await prisma.bookingVendor.deleteMany({ where: { booking: { staffNote: TAG } } })
  await prisma.booking.deleteMany({ where: { staffNote: TAG } })
  await prisma.vendor.deleteMany({ where: { name: { startsWith: TAG } } })
}

async function main() {
  const [client, pkg] = await Promise.all([prisma.user.findFirst({ where: { role: "CLIENT" } }), prisma.package.findFirst()])
  if (!client || !pkg) throw new Error("Run the base seed first.")
  await cleanup()

  section("PATCH /api/vendors/[id] — real HTTP round trip stays partial")
  as("ADMIN", "admin")
  const v = await prisma.vendor.create({ data: {
    name: `${TAG} Bright Lights`, category: "SOUNDS_LIGHTING", contactName: "Jun", contactPhone: "09171112222",
    contactEmail: "jun@brightlights.test", contactChannel: "Telegram", coverageAreas: ["Cavite"], notes: "Owns two rigs.",
  } })
  let r = await body(await vendorPATCH(json("PATCH", { name: `${TAG} Bright Lights PH` }), P({ vendorId: v.id })))
  check("PATCH with only { name } → 200, and every other field survives over real HTTP", r.status === 200
    && r.name === `${TAG} Bright Lights PH` && r.contactName === "Jun" && r.contactPhone === "09171112222"
    && r.contactEmail === "jun@brightlights.test" && r.contactChannel === "Telegram" && r.notes === "Owns two rigs."
    && JSON.stringify(r.coverageAreas) === JSON.stringify(["Cavite"]), r)

  r = await body(await vendorPATCH(json("PATCH", { contactPhone: null }), P({ vendorId: v.id })))
  check("PATCH { contactPhone: null } clears the phone but leaves the email", r.status === 200 && r.contactPhone === null && r.contactEmail === "jun@brightlights.test", r)

  r = await body(await vendorPATCH(json("PATCH", {}), P({ vendorId: v.id })))
  check("an empty PATCH body → 200 and changes nothing", r.status === 200 && r.name === `${TAG} Bright Lights PH` && r.contactEmail === "jun@brightlights.test", r)

  r = await body(await vendorPATCH(json("PATCH", { name: "" }), P({ vendorId: v.id })))
  check("clearing the REQUIRED name field is rejected (422), not silently emptied", r.status === 422, r)

  r = await body(await vendorPATCH(json("PATCH", { contactEmail: "not-an-email" }), P({ vendorId: v.id })))
  check("an invalid e-mail is rejected (422)", r.status === 422, r)

  as("COORDINATOR", "coordinator")
  r = await body(await vendorPATCH(json("PATCH", { name: "x" }), P({ vendorId: v.id })))
  check("a COORDINATOR cannot edit the vendor directory (403 — admin only)", r.status === 403, r)
  as()
  r = await body(await vendorPATCH(json("PATCH", { name: "x" }), P({ vendorId: v.id })))
  check("signed out → 403", r.status === 403, r)

  as("ADMIN", "admin")
  r = await body(await vendorPATCH(json("PATCH", { name: "x" }), P({ vendorId: "does-not-exist" })))
  check("unknown vendor → 404", r.status === 404, r)
  await vendorDELETE(json("DELETE"), P({ vendorId: v.id }))

  section("PATCH /api/bookings/[id]/vendors/[vendorId] — the Module 8 quotation bug, over real HTTP")
  const booking = await prisma.booking.create({ data: {
    clientId: client.id, packageId: pkg.id, eventType: "OTHER", eventDate: new Date(Date.UTC(2046, 0, 1)), venue: "test",
    guestCount: 10, clientPhone: "0", agreedPrice: 10000, paymentPlan: "FULL", depositAmount: 3000, staffNote: TAG,
  } })
  const v2 = await prisma.vendor.create({ data: { name: `${TAG} Catering Co`, category: "CATERING" } })
  await prisma.bookingVendor.create({ data: {
    bookingId: booking.id, vendorId: v2.id, category: "CATERING", notes: "Vegetarian option needed",
    contactedAt: new Date("2026-02-01"), confirmedAt: new Date("2026-02-03"), quotationAmount: 40000, quotationNote: "Buffet package",
  } })

  as("COORDINATOR", "coordinator")
  r = await body(await bvPATCH(json("PATCH", { quotationAmount: 45000 }), P({ bookingId: booking.id, vendorId: v2.id })))
  check("recording ONLY a new quotation → 200, and confirmedAt / notes are NOT wiped (the original bug, over real HTTP)",
    r.status === 200 && Number(r.quotationAmount) === 45000 && r.notes === "Vegetarian option needed" && r.confirmedAt !== null && r.contactedAt !== null, r)

  r = await body(await bvPATCH(json("PATCH", { confirmedAt: null }), P({ bookingId: booking.id, vendorId: v2.id })))
  check("null un-marks confirmedAt, quotation and notes survive", r.status === 200 && r.confirmedAt === null && Number(r.quotationAmount) === 45000 && r.notes === "Vegetarian option needed", r)

  r = await body(await bvPATCH(json("PATCH", { quotationAmount: -5 }), P({ bookingId: booking.id, vendorId: v2.id })))
  check("a negative quotation is rejected (422)", r.status === 422, r)

  const entry = await prisma.auditLog.findFirst({ where: { metadata: { path: ["bookingId"], equals: booking.id }, action: "UPDATE", module: "VENDOR" }, orderBy: { sequence: "desc" } })
  check("the edit is audited without copying quotation/notes text into the trail", !!entry && !/Vegetarian|Buffet|45000/.test(JSON.stringify(entry)), entry?.metadata)

  await cleanup()
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) }).finally(() => prisma.$disconnect())
