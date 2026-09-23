// test-harness/verify-booking-search-routes.ts
//
// GET /api/bookings?search=… — both ADMIN and COORDINATOR can search; CLIENT ignores it (own bookings only).
import "dotenv/config"
import { GET as bookingsGET } from "@/app/api/bookings/route"
import { prisma } from "@/lib/prisma"

const TAG = "[test:booking-search-routes]"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log("  ✅ ", n) } else { fails.push(n); console.log("  ❌ ", n, d !== undefined ? "→ " + JSON.stringify(d) : "") } }
const as = (role?: string, user?: string) => { role ? (process.env.TEST_ROLE = role) : delete process.env.TEST_ROLE; user ? (process.env.TEST_USER = user) : delete process.env.TEST_USER }

async function cleanup() { await prisma.booking.deleteMany({ where: { staffNote: TAG } }) }

async function main() {
  await cleanup()
  const anna = await prisma.user.findUnique({ where: { username: "client_anna" } })
  const pkg = await prisma.package.findFirst()
  if (!anna || !pkg) throw new Error("Run the base seed first.")
  const b = await prisma.booking.create({ data: {
    clientId: anna.id, packageId: pkg.id, eventType: "OTHER", eventDate: new Date(Date.UTC(2047, 0, 1)),
    venue: "Coral Reef Resort", guestCount: 5, clientPhone: "0", agreedPrice: 5000, paymentPlan: "FULL", depositAmount: 1000, staffNote: TAG,
  } })

  as("ADMIN", "admin")
  let r = await bookingsGET(new Request("http://x/api/bookings?search=coral"))
  let list = await r.json()
  check("ADMIN can search by venue via the real route", r.status === 200 && list.some((x: any) => x.id === b.id), list.length)

  as("COORDINATOR", "coordinator")
  r = await bookingsGET(new Request("http://x/api/bookings?search=coral"))
  list = await r.json()
  check("COORDINATOR can search too (the list page they were missing)", r.status === 200 && list.some((x: any) => x.id === b.id), list.length)

  as("CLIENT", "client_anna")
  r = await bookingsGET(new Request("http://x/api/bookings?search=coral"))
  list = await r.json()
  check("a CLIENT gets their own bookings regardless of ?search (not a search feature for clients)", r.status === 200 && list.every((x: any) => x.clientId === anna.id))

  await cleanup()
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) }).finally(() => prisma.$disconnect())
