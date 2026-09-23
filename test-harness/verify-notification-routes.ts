// test-harness/verify-notification-routes.ts
//
// The three business-event triggers, the notification bell's endpoints, and the cron reminder route.
// Drives the real route handlers (auth + Clerk stubbed by run-route-tests.sh).
import "dotenv/config"
import { POST as assignPOST } from "@/app/api/bookings/[bookingId]/staff/route"
import { PATCH as bookingPATCH } from "@/app/api/bookings/[bookingId]/route"
import { POST as reminderPOST } from "@/app/api/cron/due-date-reminders/route"
import { PATCH as markOnePATCH } from "@/app/api/notifications/[id]/route"
import { POST as markAllPOST } from "@/app/api/notifications/mark-all-read/route"
import { GET as notificationsGET } from "@/app/api/notifications/route"
import { POST as paymentsPOST } from "@/app/api/payments/route"
import { PATCH as verifyPATCH } from "@/app/api/payments/[paymentId]/verify/route"
import { _resetEmailTransportForTests } from "@/lib/email/send"
import { prisma } from "@/lib/prisma"

const TAG = "[test:notification-routes]"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log("  ✅ ", n) } else { fails.push(n); console.log("  ❌ ", n, d !== undefined ? "→ " + JSON.stringify(d) : "") } }
const section = (t: string) => console.log(`\n── ${t}`)
const as = (role?: string, user?: string) => { role ? (process.env.TEST_ROLE = role) : delete process.env.TEST_ROLE; user ? (process.env.TEST_USER = user) : delete process.env.TEST_USER }
const json = (method: string, body?: unknown) => new Request("http://x", { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })
function P<T extends object>(v: T) { return { params: Promise.resolve(v) } }
// a successful response IS the booking/payment object and has its own "status" field, so HTTP status must be applied LAST
const body = async (r: Response) => ({ ...(await r.json().catch(() => ({}))), status: r.status }) as any
const notifCount = (userId: string, type: string, titleLike: string) => prisma.notification.count({ where: { userId, type: type as any, title: { contains: titleLike } } })

async function cleanup(bookingIds: string[], userIds: string[]) {
  await prisma.payment.deleteMany({ where: { bookingId: { in: bookingIds } } })
  await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } })
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } })
}

async function main() {
  delete process.env.SMTP_HOST; _resetEmailTransportForTests()
  const anna = await prisma.user.findUnique({ where: { username: "client_anna" } })
  const admin = await prisma.user.findUnique({ where: { username: "admin" } })
  const coordinator = await prisma.user.findUnique({ where: { username: "coordinator" } })
  const pkg = await prisma.package.findFirst()
  if (!anna || !admin || !coordinator || !pkg) throw new Error("Run the base seed first.")

  const mkBooking = (status: "PENDING" | "CONFIRMED", extra: object = {}) => prisma.booking.create({ data: {
    clientId: anna.id, packageId: pkg.id, eventType: "OTHER", eventDate: new Date("2051-01-01T00:00:00Z"), venue: "x",
    guestCount: 10, clientPhone: "0", agreedPrice: 5000, paymentPlan: "FULL", depositAmount: 1000, status, staffNote: TAG, ...extra,
  } })
  const bookingIds: string[] = []
  const cleanupAll = () => cleanup(bookingIds, [anna.id, admin.id, coordinator.id])
  await cleanupAll()

  section("Trigger 1 — staff notified when a client submits payment proof")
  const b1 = await mkBooking("PENDING"); bookingIds.push(b1.id)
  as("CLIENT", "client_anna")
  let r = await body(await paymentsPOST(json("POST", { bookingId: b1.id, paymentType: "DEPOSIT", method: "GCASH", amount: 1000, referenceNumber: "REF1" })))
  check("payment submitted → 201", r.status === 201, r)
  check("…every ACTIVE admin/coordinator was notified", (await notifCount(admin.id, "PAYMENT_SUBMITTED", "New payment")) === 1 && (await notifCount(coordinator.id, "PAYMENT_SUBMITTED", "New payment")) === 1)
  check("…the client themselves was NOT notified of their own submission", (await notifCount(anna.id, "PAYMENT_SUBMITTED", "New payment")) === 0)

  section("Trigger 2 — client notified when their payment is flagged")
  as("ADMIN", "admin")
  const payment = await prisma.payment.findFirst({ where: { bookingId: b1.id } })
  r = await body(await verifyPATCH(json("PATCH", { action: "FLAG", verificationNote: "Blurry receipt" }), P({ paymentId: payment!.id })))
  check("flag → 200", r.status === 200, r)
  const flagRow = await prisma.notification.findFirst({ where: { userId: anna.id, type: "PAYMENT_FLAGGED" } })
  check("the CLIENT was notified", !!flagRow, flagRow)
  check("…the note is included, and it links back to the booking", !!flagRow && flagRow.body.includes("Blurry receipt") && flagRow.link === `/portal/bookings/${b1.id}`, flagRow)
  check("…staff were NOT notified of their own action", (await notifCount(admin.id, "PAYMENT_FLAGGED", "")) === 0)

  section("Trigger 3 — client notified when STAFF cancels their booking")
  const b2 = await mkBooking("CONFIRMED", { depositVerifiedAt: new Date(), depositVerifiedById: admin.id }); bookingIds.push(b2.id)
  as("ADMIN", "admin")
  r = await body(await bookingPATCH(json("PATCH", { status: "CANCELLED", cancellationReason: "Venue unavailable" }), P({ bookingId: b2.id })))
  check("staff cancels → 200", r.status === 200, r)
  check("the client was notified", (await notifCount(anna.id, "BOOKING_CANCELLED", "cancelled")) === 1)

  const b3 = await mkBooking("CONFIRMED", { depositVerifiedAt: new Date(), depositVerifiedById: admin.id }); bookingIds.push(b3.id)
  as("CLIENT", "client_anna")
  await body(await bookingPATCH(json("PATCH", { status: "CANCELLATION_REQUESTED", reason: "changed my mind" } as any), P({ bookingId: b3.id })))
  const before = await notifCount(anna.id, "BOOKING_CANCELLED", "")
  as("ADMIN", "admin")
  // decline the request (restore to confirmed) is NOT a cancellation — must not notify BOOKING_CANCELLED
  await bookingPATCH(json("PATCH", { status: "CONFIRMED" }), P({ bookingId: b3.id }))
  check("declining a cancellation request does NOT send a cancellation notice", (await notifCount(anna.id, "BOOKING_CANCELLED", "")) === before)

  section("Notification bell endpoints")
  as("ADMIN", "admin")
  let listRes = await notificationsGET(); let listBody = await listRes.json()
  check("GET returns items + an accurate unreadCount", listRes.status === 200 && listBody.unreadCount === 1 && listBody.items.length > 0, listBody.unreadCount)
  const mine = listBody.items.find((n: any) => n.type === "PAYMENT_SUBMITTED")
  r = await body(await markOnePATCH(json("PATCH"), P({ id: mine.id })))
  check("mark ONE read → 200", r.status === 200, r)
  check("…isRead flips in the database", (await prisma.notification.findUnique({ where: { id: mine.id } }))?.isRead === true)
  as("COORDINATOR", "coordinator")
  r = await body(await markOnePATCH(json("PATCH"), P({ id: mine.id })))
  check("a DIFFERENT user cannot mark someone else's notification read (404, scoped)", r.status === 404, r)
  as("ADMIN", "admin")
  await markAllPOST()
  listRes = await notificationsGET(); listBody = await listRes.json()
  check("mark-all-read → unreadCount is now 0", listBody.unreadCount === 0, listBody.unreadCount)

  section("Due-date reminder cron")
  const b4 = await mkBooking("PENDING", { depositDueDate: new Date(Date.now() + 24 * 3_600_000) }); bookingIds.push(b4.id)
  r = await body(await reminderPOST(new Request("http://x", { method: "POST" })))
  check("no secret configured / not provided → 401", r.status === 401, r)
  process.env.CRON_SECRET = "test-secret-123"
  r = await body(await reminderPOST(new Request("http://x", { method: "POST", headers: { authorization: "Bearer wrong" } })))
  check("wrong secret → 401", r.status === 401, r)
  r = await body(await reminderPOST(new Request("http://x", { method: "POST", headers: { authorization: "Bearer test-secret-123" } })))
  check("correct secret → 200, and it sent at least one reminder", r.status === 200 && r.sent >= 1, r)
  check("the client got a PAYMENT_DUE_SOON notification linking to their booking", (await prisma.notification.count({ where: { userId: anna.id, type: "PAYMENT_DUE_SOON", link: `/portal/bookings/${b4.id}` } })) === 1)
  r = await body(await reminderPOST(new Request("http://x", { method: "POST", headers: { authorization: "Bearer test-secret-123" } })))
  check("running it again within the same day does NOT duplicate the reminder", (await prisma.notification.count({ where: { userId: anna.id, type: "PAYMENT_DUE_SOON", link: `/portal/bookings/${b4.id}` } })) === 1, r)
  delete process.env.CRON_SECRET

  await cleanupAll()
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch(async (e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
