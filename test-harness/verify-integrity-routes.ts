// test-harness/verify-integrity-routes.ts
//
// Module 9 — route-level tests. Drives the REAL route handlers (auth stubbed by run-route-tests.sh) against
// your local database. Creates temporary bookings tagged "[test:routes]" on far-future dates and removes them.
import "dotenv/config"
import { PATCH as bookingPATCH } from "@/app/api/bookings/[bookingId]/route"
import { POST as cancelRequestPOST } from "@/app/api/bookings/[bookingId]/cancel-request/route"
import { PATCH as termsPATCH } from "@/app/api/bookings/[bookingId]/contract-terms/route"
import { GET as integrityGET } from "@/app/api/integrity/route"
import { POST as manualPOST } from "@/app/api/payments/manual/route"
import { PATCH as verifyPATCH } from "@/app/api/payments/[paymentId]/verify/route"
import { PrismaClient, type BookingStatus, type PaymentStatus } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: (process.env.OWNER_DATABASE_URL ?? process.env.DATABASE_URL)! }) })
const TAG = "[test:routes]"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log("  ✅ ", n) } else { fails.push(n); console.log("  ❌ ", n, d !== undefined ? "→ " + (typeof d === "string" ? d : JSON.stringify(d)) : "") } }
const section = (t: string) => console.log(`\n── ${t}`)
const as = (role?: string, user?: string, ghost = false) => {
  role ? (process.env.TEST_ROLE = role) : delete process.env.TEST_ROLE
  user ? (process.env.TEST_USER = user) : delete process.env.TEST_USER
  ghost ? (process.env.TEST_GHOST = "1") : delete process.env.TEST_GHOST
}
const json = (method: string, body?: unknown) => new Request("http://localhost/api/x", { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })
const P = <T extends object>(v: T) => ({ params: Promise.resolve(v) })
// NB: a successful response IS the booking/payment object and has its own "status" field, so the HTTP status must be applied LAST.
const body = async (r: Response) => ({ ...(await r.json().catch(() => ({}))), status: r.status }) as { status: number; error?: string; code?: string; [k: string]: any }

let n = 0
const nextDate = () => new Date(Date.UTC(2050, 0, 1 + n++))
let anna = "", ben = "", admin = "", pkg = ""

async function mk(status: BookingStatus, o: { date?: Date; deposit?: PaymentStatus | null; client?: string } = {}) {
  const b = await prisma.booking.create({ data: {
    clientId: o.client ?? anna, packageId: pkg, eventType: "OTHER", eventDate: o.date ?? nextDate(), venue: "route test", guestCount: 10,
    clientPhone: "0", agreedPrice: 10000, status, staffNote: TAG, paymentPlan: "FULL", depositAmount: 3000,
  } })
  let payment = null
  if (o.deposit) payment = await prisma.payment.create({ data: {
    bookingId: b.id, paymentType: "DEPOSIT", method: "GCASH", amount: 3000, status: o.deposit, submittedAt: new Date(),
    ...(o.deposit === "VERIFIED" ? { verifiedById: admin, verifiedAt: new Date() } : {}),
  } })
  return { b, payment }
}
const statusOf = async (id: string) => (await prisma.booking.findUnique({ where: { id }, select: { status: true } }))?.status
const audits = (bookingOrPaymentKey: string, id: string, extra: object = {}) =>
  prisma.auditLog.count({ where: { metadata: { path: [bookingOrPaymentKey], equals: id }, ...extra } })

async function cleanup() {
  await prisma.payment.deleteMany({ where: { booking: { staffNote: TAG } } })
  await prisma.installment.deleteMany({ where: { booking: { staffNote: TAG } } })
  await prisma.booking.deleteMany({ where: { staffNote: TAG } })
  await owner.auditWriteFailure.deleteMany({ where: { userId: "ghost-user" } })
}

async function main() {
  const [a, bn, ad, pk] = await Promise.all([
    prisma.user.findUnique({ where: { username: "client_anna" } }), prisma.user.findUnique({ where: { username: "client_ben" } }),
    prisma.user.findUnique({ where: { username: "admin" } }), prisma.package.findFirst(),
  ])
  if (!a || !bn || !ad || !pk) throw new Error("Run the main seed first.")
  anna = a.id; ben = bn.id; admin = ad.id; pkg = pk.id
  await cleanup()

  section("PATCH /api/bookings/[id] — confirm")
  as("ADMIN", "admin")
  const noDep = (await mk("PENDING")).b
  let r = await body(await bookingPATCH(json("PATCH", { status: "CONFIRMED" }), P({ bookingId: noDep.id })))
  check("no verified deposit → 409 DEPOSIT_NOT_VERIFIED (no override)", r.status === 409 && r.code === "DEPOSIT_NOT_VERIFIED", r)
  check("…the message tells staff what to do", /verified deposit is required/i.test(r.error ?? "") && /manual payment/i.test(r.error ?? ""), r.error)
  check("…the booking stays PENDING", (await statusOf(noDep.id)) === "PENDING")
  check("…the blocked attempt is itself audited (FAILURE)", (await audits("bookingId", noDep.id, { status: "FAILURE", action: "CONFIRM" })) === 1)

  const sub = (await mk("PENDING", { deposit: "SUBMITTED" })).b
  r = await body(await bookingPATCH(json("PATCH", { status: "CONFIRMED" }), P({ bookingId: sub.id })))
  check("deposit only SUBMITTED (not verified) → 409 DEPOSIT_NOT_VERIFIED", r.status === 409 && r.code === "DEPOSIT_NOT_VERIFIED", r)

  const ok = (await mk("PENDING", { deposit: "VERIFIED" })).b
  r = await body(await bookingPATCH(json("PATCH", { status: "CONFIRMED" }), P({ bookingId: ok.id })))
  check("verified deposit + free date → 200 CONFIRMED", r.status === 200 && r.status !== undefined && (await statusOf(ok.id)) === "CONFIRMED", r)
  check("…exactly ONE success audit entry (CONFIRM), written in the same transaction", (await audits("bookingId", ok.id, { action: "CONFIRM", status: "SUCCESS" })) === 1)
  r = await body(await bookingPATCH(json("PATCH", { status: "CONFIRMED" }), P({ bookingId: ok.id })))
  check("confirming an already-confirmed booking → 409 INVALID_STATE", r.status === 409 && r.code === "INVALID_STATE", r)

  const rival = (await mk("PENDING", { deposit: "VERIFIED", date: ok.eventDate })).b
  r = await body(await bookingPATCH(json("PATCH", { status: "CONFIRMED" }), P({ bookingId: rival.id })))
  check("date already held → 409 DATE_TAKEN", r.status === 409 && r.code === "DATE_TAKEN", r)
  check("…rival stays PENDING", (await statusOf(rival.id)) === "PENDING")

  section("Cancel, and the date is released")
  r = await body(await bookingPATCH(json("PATCH", { status: "CANCELLED", cancellationReason: "Client moved abroad" }), P({ bookingId: ok.id })))
  check("cancel a confirmed booking → 200 CANCELLED", r.status === 200 && (await statusOf(ok.id)) === "CANCELLED", r)
  check("…audited (DELETE) exactly once", (await audits("bookingId", ok.id, { action: "DELETE", status: "SUCCESS" })) === 1)
  r = await body(await bookingPATCH(json("PATCH", { status: "CANCELLED", cancellationReason: "again" }), P({ bookingId: ok.id })))
  check("cancelling twice → 409", r.status === 409, r)
  r = await body(await bookingPATCH(json("PATCH", { status: "CONFIRMED" }), P({ bookingId: rival.id })))
  check("the waiting booking can now be confirmed on that date", r.status === 200 && (await statusOf(rival.id)) === "CONFIRMED", r)

  section("Cancellation request holds the date; 'Decline & keep confirmed' restores it")
  as("CLIENT", "client_anna")
  const held = (await mk("CONFIRMED", { deposit: "VERIFIED", client: anna })).b
  r = await body(await cancelRequestPOST(json("POST", { reason: "We are reconsidering the venue." }), P({ bookingId: held.id })))
  check("client requests cancellation → 200 CANCELLATION_REQUESTED", r.status === 200 && (await statusOf(held.id)) === "CANCELLATION_REQUESTED", r)
  check("…audited exactly once", (await audits("bookingId", held.id, { action: "UPDATE", status: "SUCCESS" })) === 1)
  as("ADMIN", "admin")
  const wants = (await mk("PENDING", { deposit: "VERIFIED", date: held.eventDate })).b
  r = await body(await bookingPATCH(json("PATCH", { status: "CONFIRMED" }), P({ bookingId: wants.id })))
  check("while the request is UNDECIDED another booking still cannot take the date (409 DATE_TAKEN)", r.status === 409 && r.code === "DATE_TAKEN", r)
  r = await body(await bookingPATCH(json("PATCH", { status: "CONFIRMED" }), P({ bookingId: held.id })))
  check("'Decline & keep confirmed' → 200, back to CONFIRMED", r.status === 200 && (await statusOf(held.id)) === "CONFIRMED", r)
  check("…recorded as DECLINE (not a second CONFIRM)", (await audits("bookingId", held.id, { action: "DECLINE" })) === 1)
  check("…and there is still exactly ONE confirmed booking on that date",
    (await prisma.booking.count({ where: { eventDate: held.eventDate, status: { in: ["CONFIRMED", "CANCELLATION_REQUESTED"] } } })) === 1)

  section("PATCH /api/payments/[id]/verify")
  const holder = (await mk("CONFIRMED", { deposit: "VERIFIED" })).b
  const blocked = await mk("PENDING", { deposit: "SUBMITTED", date: holder.eventDate })
  r = await body(await verifyPATCH(json("PATCH", { action: "VERIFY" }), P({ paymentId: blocked.payment!.id })))
  check("verify a deposit whose date is held → 409 DATE_TAKEN", r.status === 409 && r.code === "DATE_TAKEN", r)
  check("…payment stays SUBMITTED and booking PENDING (nothing half-done)",
    (await prisma.payment.findUnique({ where: { id: blocked.payment!.id } }))?.status === "SUBMITTED" && (await statusOf(blocked.b.id)) === "PENDING")
  check("…no VERIFY success entry was written", (await audits("paymentId", blocked.payment!.id, { action: "VERIFY", status: "SUCCESS" })) === 0)

  const free = await mk("PENDING", { deposit: "SUBMITTED" })
  r = await body(await verifyPATCH(json("PATCH", { action: "VERIFY", verificationNote: "ok" }), P({ paymentId: free.payment!.id })))
  check("verify a deposit on a free date → 200", r.status === 200, r)
  check("…booking CONFIRMED and payment VERIFIED together", (await statusOf(free.b.id)) === "CONFIRMED" && (await prisma.payment.findUnique({ where: { id: free.payment!.id } }))?.status === "VERIFIED")
  check("…exactly ONE VERIFY audit entry", (await audits("paymentId", free.payment!.id, { action: "VERIFY", status: "SUCCESS" })) === 1)
  r = await body(await verifyPATCH(json("PATCH", { action: "VERIFY" }), P({ paymentId: free.payment!.id })))
  check("verifying it again → 409", r.status === 409, r)

  const raced = await mk("PENDING", { deposit: "SUBMITTED" })
  const both = await Promise.all([0, 1].map(async () => (await verifyPATCH(json("PATCH", { action: "VERIFY" }), P({ paymentId: raced.payment!.id }))).status))
  check("two staff clicking Verify at the same moment → exactly one 200 and one 409", both.filter((s) => s === 200).length === 1 && both.filter((s) => s === 409).length === 1, both)
  check("…and only ONE audit entry", (await audits("paymentId", raced.payment!.id, { action: "VERIFY", status: "SUCCESS" })) === 1)

  const flag = await mk("PENDING", { deposit: "SUBMITTED" })
  r = await body(await verifyPATCH(json("PATCH", { action: "FLAG", verificationNote: "blurry" }), P({ paymentId: flag.payment!.id })))
  check("flag a payment → 200 FLAGGED, booking untouched, one audit entry",
    r.status === 200 && (await prisma.payment.findUnique({ where: { id: flag.payment!.id } }))?.status === "FLAGGED" && (await statusOf(flag.b.id)) === "PENDING"
    && (await audits("paymentId", flag.payment!.id, { action: "UPDATE", status: "SUCCESS" })) === 1, r)

  section("POST /api/payments/manual (walk-in / cash deposit)")
  const walk = (await mk("PENDING")).b
  r = await body(await manualPOST(json("POST", { bookingId: walk.id, paymentType: "DEPOSIT", method: "CASH", amount: 3000 })))
  check("manual deposit on a pending booking with a free date → 201 and the booking is CONFIRMED", r.status === 201 && (await statusOf(walk.id)) === "CONFIRMED", r)
  r = await body(await manualPOST(json("POST", { bookingId: walk.id, paymentType: "DEPOSIT", method: "CASH", amount: 3000 })))
  check("a second manual deposit for the now-confirmed booking → 409", r.status === 409, r)
  const clash = (await mk("PENDING", { date: holder.eventDate })).b
  const before = await prisma.payment.count({ where: { bookingId: clash.id } })
  r = await body(await manualPOST(json("POST", { bookingId: clash.id, paymentType: "DEPOSIT", method: "CASH", amount: 3000 })))
  check("manual deposit on a held date → 409 DATE_TAKEN", r.status === 409 && r.code === "DATE_TAKEN", r)
  check("…and no payment row was left behind", (await prisma.payment.count({ where: { bookingId: clash.id } })) === before)

  section("Client edit (PATCH by the booking's owner)")
  as("CLIENT", "client_anna")
  const mine = (await mk("PENDING", { client: anna })).b
  r = await body(await bookingPATCH(json("PATCH", { eventDate: holder.eventDate.toISOString().slice(0, 10) }), P({ bookingId: mine.id })))
  check("moving to a HELD date → 409 'already booked'", r.status === 409 && /already booked/i.test(r.error ?? ""), r)
  const freeDay = nextDate().toISOString().slice(0, 10)
  r = await body(await bookingPATCH(json("PATCH", { eventDate: freeDay }), P({ bookingId: mine.id })))
  check("moving to a free date → 200", r.status === 200 && (await prisma.booking.findUnique({ where: { id: mine.id } }))?.eventDate.toISOString().slice(0, 10) === freeDay, r)
  check("…and exactly one UPDATE audit entry (atomic)", (await audits("bookingId", mine.id, { action: "UPDATE", status: "SUCCESS" })) === 1)

  section("Fail-closed audit: an action that cannot be recorded does not happen")
  as("ADMIN", "admin", true)     // the acting user's id does not exist → the audit entry violates a foreign key
  const guarded = (await mk("PENDING")).b
  const failsBefore = await prisma.auditWriteFailure.count()
  r = await body(await termsPATCH(json("PATCH", { staffNote: "SHOULD-NOT-PERSIST" }), P({ bookingId: guarded.id })))
  check("audit write fails → 503 AUDIT_WRITE_FAILED with a clear message", r.status === 503 && r.code === "AUDIT_WRITE_FAILED" && /nothing was changed/i.test(r.error ?? ""), r)
  check("…and the booking was NOT changed (rolled back)", (await prisma.booking.findUnique({ where: { id: guarded.id } }))?.staffNote === TAG)
  check("…and the failure was recorded for the dashboard", (await prisma.auditWriteFailure.count()) === failsBefore + 1)
  as("ADMIN", "admin")
  r = await body(await termsPATCH(json("PATCH", { staffNote: "persisted" }), P({ bookingId: guarded.id })))
  check("the same action with a real user succeeds", r.status === 200 && (await prisma.booking.findUnique({ where: { id: guarded.id } }))?.staffNote === "persisted", r)

  section("GET /api/integrity")
  as()
  check("signed out → 403", (await integrityGET()).status === 403)
  as("CLIENT", "client_anna");      check("CLIENT → 403", (await integrityGET()).status === 403)
  as("COORDINATOR", "coordinator"); check("COORDINATOR → 403 (admin only)", (await integrityGET()).status === 403)
  as("ADMIN", "admin")
  const ir = await integrityGET(); const ij = await ir.json()
  check("ADMIN → 200 with five checks and an overall verdict", ir.status === 200 && ij.checks.length === 5 && ["pass", "warn", "fail"].includes(ij.overall), ij.overall)
  check("no-store caching", ir.headers.get("cache-control") === "no-store")
  check("the visit is recorded in the audit trail", (await prisma.auditLog.count({ where: { userId: admin, module: "REPORT", description: { contains: "system integrity checks" } } })) >= 1)

  await cleanup()
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) }).finally(async () => { await prisma.$disconnect(); await owner.$disconnect() })
