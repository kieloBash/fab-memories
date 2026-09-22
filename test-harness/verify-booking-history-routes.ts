// test-harness/verify-booking-history-routes.ts
//
// GET /api/bookings/[bookingId]/history — role gating and ownership scoping, through the real route handler.
import "dotenv/config"
import { GET as historyGET } from "@/app/api/bookings/[bookingId]/history/route"
import { logAction } from "@/lib/audit/log"
import { prisma } from "@/lib/prisma"

const TAG = "[test:history-routes]"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log("  ✅ ", n) } else { fails.push(n); console.log("  ❌ ", n, d !== undefined ? "→ " + JSON.stringify(d) : "") } }
const as = (role?: string, user?: string) => { role ? (process.env.TEST_ROLE = role) : delete process.env.TEST_ROLE; user ? (process.env.TEST_USER = user) : delete process.env.TEST_USER }
const P = (id: string) => ({ params: Promise.resolve({ bookingId: id }) })

async function cleanup() { await prisma.booking.deleteMany({ where: { staffNote: TAG } }) }

async function main() {
  const [anna, ben, admin, pkg] = await Promise.all([
    prisma.user.findUnique({ where: { username: "client_anna" } }), prisma.user.findUnique({ where: { username: "client_ben" } }),
    prisma.user.findFirst({ where: { role: "ADMIN" } }), prisma.package.findFirst(),
  ])
  if (!anna || !ben || !admin || !pkg) throw new Error("Run the base seed first.")
  await cleanup()

  const booking = await prisma.booking.create({ data: {
    clientId: anna.id, packageId: pkg.id, eventType: "OTHER", eventDate: new Date(Date.UTC(2044, 5, 1)), venue: "x",
    guestCount: 5, clientPhone: "0", agreedPrice: 5000, paymentPlan: "FULL", depositAmount: 1000, staffNote: TAG,
  } })
  await logAction({ userId: anna.id, action: "CREATE", module: "BOOKING", description: "x", metadata: { bookingId: booking.id } })

  as("ADMIN", "admin")
  let r = await historyGET(new Request("http://x"), P(booking.id))
  check("ADMIN → 200 with the event", r.status === 200 && (await r.json()).length === 1)

  as("COORDINATOR", "coordinator")
  r = await historyGET(new Request("http://x"), P(booking.id))
  check("COORDINATOR → 200", r.status === 200)

  as("CLIENT", "client_anna")
  r = await historyGET(new Request("http://x"), P(booking.id))
  check("the OWNING client → 200", r.status === 200)

  as("CLIENT", "client_ben")
  r = await historyGET(new Request("http://x"), P(booking.id))
  check("a DIFFERENT client → 403 (cannot see someone else's booking history)", r.status === 403)

  as("VENDOR", "vendor")
  r = await historyGET(new Request("http://x"), P(booking.id))
  check("VENDOR → 403", r.status === 403)

  as()
  r = await historyGET(new Request("http://x"), P(booking.id))
  check("signed out → 403", r.status === 403)

  as("ADMIN", "admin")
  r = await historyGET(new Request("http://x"), P("does-not-exist"))
  check("unknown booking → 404", r.status === 404)

  await cleanup()
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) }).finally(() => prisma.$disconnect())
