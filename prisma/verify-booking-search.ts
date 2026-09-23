// prisma/verify-booking-search.ts
/**
 * Server-side booking search (client name / venue) — shared by the admin and coordinator booking lists.
 *   npx tsx prisma/verify-booking-search.ts
 */
import "dotenv/config"
import { getAllBookings } from "@/features/bookings/bookings.query"
import { prisma } from "@/lib/prisma"

const TAG = "[test:booking-search]"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log(`  ✅  ${n}`) } else { fails.push(n); console.log(`  ❌  ${n}${d !== undefined ? `\n        → ${JSON.stringify(d)}` : ""}`) } }

async function cleanup() { await prisma.booking.deleteMany({ where: { staffNote: TAG } }) }

async function main() {
  await cleanup()
  const anna = await prisma.user.findUnique({ where: { username: "client_anna" } })
  const ben = await prisma.user.findUnique({ where: { username: "client_ben" } })
  const pkg = await prisma.package.findFirst()
  if (!anna || !ben || !pkg) throw new Error("Run the base seed first.")
  const mk = (clientId: string, venue: string, day: number) => prisma.booking.create({ data: {
    clientId, packageId: pkg.id, eventType: "OTHER", eventDate: new Date(Date.UTC(2046, 0, day)), venue,
    guestCount: 5, clientPhone: "0", agreedPrice: 5000, paymentPlan: "FULL", depositAmount: 1000, staffNote: TAG,
  } })
  await mk(anna.id, "Sunset Garden Manila", 1)
  await mk(ben.id, "Sunset Garden Manila", 2)
  await mk(anna.id, "The Grand Ballroom", 3)

  const byVenue = await getAllBookings({ search: "sunset" })
  check("search matches the VENUE, case-insensitively", byVenue.filter((b) => b.staffNote === TAG).length === 2, byVenue.length)

  const byClientName = await getAllBookings({ search: anna.fullName.split(" ")[0] })
  check("search matches the CLIENT'S NAME", byClientName.some((b) => b.staffNote === TAG && b.clientId === anna.id), byClientName.length)

  const combined = await getAllBookings({ search: "sunset", eventType: "OTHER" })
  check("search combines with OTHER filters (eventType)", combined.filter((b) => b.staffNote === TAG).length === 2)

  const none = await getAllBookings({ search: "no-such-venue-or-client-xyz" })
  check("no match → empty, not an error", none.filter((b) => b.staffNote === TAG).length === 0)

  const all = await getAllBookings({})
  const filtered = await getAllBookings({ search: "" })
  check("an empty search string returns everything (not filtered)", filtered.length === all.length)

  await cleanup()
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) }).finally(() => prisma.$disconnect())
