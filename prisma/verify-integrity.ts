// prisma/verify-integrity.ts
/**
 * Module 9 data-layer checks — booking rules + atomic audit. Talks to the database directly (no login).
 *
 *   npx tsx prisma/verify-integrity.ts        # exits 1 if anything fails
 *
 * Creates temporary bookings tagged "[test:integrity]" on far-future dates (year 2040+) and removes them.
 * Audit entries it causes stay in the (immutable) trail — that is expected.
 */
import "dotenv/config"

import { auditedTransaction, logAction } from "@/lib/audit/log"
import { DomainError, AuditWriteError, type DomainErrorCode } from "@/lib/domain-errors"
import { isDateAvailable } from "@/features/bookings/bookings.query"
import { transitionBooking } from "@/features/bookings/bookings.transition"
import { verifyDepositPaymentRecord, verifyFullBalancePaymentRecord, flagPaymentRecord, recordManualPaymentRecord } from "@/features/payments/payments.query"
import { verifyAuditChainIntegrity } from "@/features/audit/audit.query"
import { prisma } from "@/lib/prisma"
import { getIntegrityReport } from "@/features/integrity/integrity.query"
import { getRiskIndicators } from "@/features/reports/reports.risk"
import { processClerkEvent } from "@/lib/clerk/webhook-handler"
import { PrismaClient, type BookingStatus, type PaymentStatus } from "@/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

/** Owner-role connection — used ONLY to simulate an insider tampering with the audit trail, and for cleanup
 *  of tables the restricted application role may not touch. */
const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: (process.env.OWNER_DATABASE_URL ?? process.env.DATABASE_URL)! }) })

const TAG = "[test:integrity]"
let passed = 0
const failures: string[] = []
const check = (name: string, ok: boolean, detail?: unknown) => {
  if (ok) { passed++; console.log(`  ✅  ${name}`) }
  else { failures.push(name); console.log(`  ❌  ${name}${detail !== undefined ? `\n        → ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`) }
}
const section = (t: string) => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 62 - t.length))}`)

let dayCounter = 0
const nextDate = () => new Date(Date.UTC(2040, 0, 1 + dayCounter++))

let clientId = "", adminId = "", packageId = ""

async function mk(status: BookingStatus, o: { date?: Date; deposit?: PaymentStatus | null } = {}) {
  const b = await prisma.booking.create({
    data: {
      clientId, packageId, eventType: "OTHER", eventDate: o.date ?? nextDate(), venue: "test venue",
      guestCount: 10, clientPhone: "0", agreedPrice: 10000, status, staffNote: TAG, paymentPlan: "FULL", depositAmount: 3000,
    },
  })
  if (o.deposit) {
    await prisma.payment.create({
      data: {
        bookingId: b.id, paymentType: "DEPOSIT", method: "GCASH", amount: 3000, status: o.deposit,
        submittedAt: new Date(), verifiedById: o.deposit === "VERIFIED" || o.deposit === "FLAGGED" ? adminId : undefined,
        verifiedAt: o.deposit === "VERIFIED" || o.deposit === "FLAGGED" ? new Date() : undefined,
      },
    })
  }
  return b
}

/** Runs a transition the way the routes do: in its own transaction. Returns the error code (or "OK"). */
async function go(bookingId: string, to: BookingStatus): Promise<DomainErrorCode | "OK" | "OTHER"> {
  try { await prisma.$transaction((tx) => transitionBooking(tx, { bookingId, to, actorId: adminId })); return "OK" }
  catch (e) { return e instanceof DomainError ? e.code : "OTHER" }
}
const statusOf = async (id: string) => (await prisma.booking.findUnique({ where: { id }, select: { status: true } }))?.status
const codeOf = async (fn: () => Promise<unknown>): Promise<string> => {
  try { await fn(); return "OK" } catch (e) { return e instanceof DomainError ? e.code : `OTHER:${(e as Error).message?.slice(0, 80)}` }
}

async function cleanup() {
  const where = { booking: { staffNote: TAG } }
  await prisma.payment.deleteMany({ where })
  await prisma.installment.deleteMany({ where })
  await prisma.booking.deleteMany({ where: { staffNote: TAG } })
  await owner.auditWriteFailure.deleteMany({ where: { description: { contains: TAG } } })
}

async function main() {
  const t0 = Date.now()
  const client = await prisma.user.findFirst({ where: { role: "CLIENT" } })
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  const pkg = await prisma.package.findFirst()
  if (!client || !admin || !pkg) { console.error("Run the main seed first (prisma/seed.ts)."); process.exit(1) }
  clientId = client.id; adminId = admin.id; packageId = pkg.id
  await cleanup()

  // ═════════════════════════════════════════════════════════════
  section("Transition matrix (bookings.transition.ts)")
  const matrix: [string, BookingStatus, BookingStatus, PaymentStatus | null, string][] = [
    ["PENDING → CONFIRMED, verified deposit",           "PENDING", "CONFIRMED", "VERIFIED", "OK"],
    ["PENDING → CONFIRMED, NO deposit",                 "PENDING", "CONFIRMED", null,       "DEPOSIT_NOT_VERIFIED"],
    ["PENDING → CONFIRMED, deposit only SUBMITTED",     "PENDING", "CONFIRMED", "SUBMITTED","DEPOSIT_NOT_VERIFIED"],
    ["PENDING → CONFIRMED, deposit FLAGGED",            "PENDING", "CONFIRMED", "FLAGGED",  "DEPOSIT_NOT_VERIFIED"],
    ["PENDING → CANCELLED",                             "PENDING", "CANCELLED", null,       "OK"],
    ["PENDING → CANCELLATION_REQUESTED",                "PENDING", "CANCELLATION_REQUESTED", null, "INVALID_STATE"],
    ["CONFIRMED → CONFIRMED (already)",                 "CONFIRMED", "CONFIRMED", "VERIFIED", "INVALID_STATE"],
    ["CONFIRMED → CANCELLATION_REQUESTED",              "CONFIRMED", "CANCELLATION_REQUESTED", "VERIFIED", "OK"],
    ["CONFIRMED → CANCELLED",                           "CONFIRMED", "CANCELLED", "VERIFIED", "OK"],
    ["CONFIRMED → PENDING (never)",                     "CONFIRMED", "PENDING", "VERIFIED", "INVALID_STATE"],
    ["CANCELLATION_REQUESTED → CONFIRMED (restore)",    "CANCELLATION_REQUESTED", "CONFIRMED", "VERIFIED", "OK"],
    ["CANCELLATION_REQUESTED → CANCELLED",              "CANCELLATION_REQUESTED", "CANCELLED", "VERIFIED", "OK"],
    ["CANCELLATION_REQUESTED → CONFIRMED, no deposit (invariant)", "CANCELLATION_REQUESTED", "CONFIRMED", null, "DEPOSIT_NOT_VERIFIED"],
    ["CANCELLED → CONFIRMED (never)",                   "CANCELLED", "CONFIRMED", "VERIFIED", "INVALID_STATE"],
    ["CANCELLED → PENDING (never)",                     "CANCELLED", "PENDING", null, "INVALID_STATE"],
  ]
  for (const [name, from, to, dep, expected] of matrix) {
    const b = await mk(from, { deposit: dep })
    const got = await go(b.id, to)
    check(`${name.padEnd(58)} → ${expected}`, got === expected, { got })
    if (expected !== "OK") check(`   …and the booking is unchanged (${from})`, (await statusOf(b.id)) === from)
  }
  check("unknown booking → BOOKING_NOT_FOUND", (await go("does-not-exist", "CONFIRMED")) === "BOOKING_NOT_FOUND")

  // ═════════════════════════════════════════════════════════════
  section("One held booking per date — friendly check, then the index")
  const D = nextDate()
  const a = await mk("CONFIRMED", { date: D, deposit: "VERIFIED" })
  const b = await mk("PENDING",   { date: D, deposit: "VERIFIED" })
  check("date held by a CONFIRMED booking → second cannot confirm (DATE_TAKEN)", (await go(b.id, "CONFIRMED")) === "DATE_TAKEN")
  check("isDateAvailable is false while CONFIRMED", (await isDateAvailable(D.toISOString().slice(0, 10))) === false)
  await go(a.id, "CANCELLATION_REQUESTED")
  check("…still held while the cancellation request is UNDECIDED", (await isDateAvailable(D.toISOString().slice(0, 10))) === false)
  check("…and a second booking still cannot confirm it", (await go(b.id, "CONFIRMED")) === "DATE_TAKEN")
  check("staff 'Decline & keep confirmed' (restore) still works — no double-confirm possible", (await go(a.id, "CONFIRMED")) === "OK")
  await go(a.id, "CANCELLED")
  check("date is free again once cancelled", (await isDateAvailable(D.toISOString().slice(0, 10))) === true)
  check("the waiting booking can now confirm", (await go(b.id, "CONFIRMED")) === "OK")
  const sneaky = await mk("PENDING", { date: D })
  const raw = await codeOf(() => prisma.booking.update({ where: { id: sneaky.id }, data: { status: "CONFIRMED" } }))
  check("DB INDEX backstop: a raw UPDATE that bypasses the app is refused", raw !== "OK", raw)
  const idx = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM pg_indexes WHERE indexname = 'Booking_held_eventDate_key'`
  check("index Booking_held_eventDate_key exists", idx[0].n === 1)

  // ═════════════════════════════════════════════════════════════
  section("Concurrency — racing requests can never both win")
  let bothWon = 0, noWinner = 0, wrongError = 0
  const ROUNDS = 25
  for (let r = 0; r < ROUNDS; r++) {
    const d = nextDate()
    const x = await mk("PENDING", { date: d, deposit: "VERIFIED" })
    const y = await mk("PENDING", { date: d, deposit: "VERIFIED" })
    const res = await Promise.all([go(x.id, "CONFIRMED"), go(y.id, "CONFIRMED")])
    const wins = res.filter((c) => c === "OK").length
    if (wins === 2) bothWon++
    if (wins === 0) noWinner++
    if (res.some((c) => c !== "OK" && c !== "DATE_TAKEN")) wrongError++
    const held = await prisma.booking.count({ where: { eventDate: d, status: "CONFIRMED", staffNote: TAG } })
    if (held !== 1) bothWon++
  }
  check(`${ROUNDS} two-way races: never two confirmed on one date`, bothWon === 0, { bothWon })
  check(`${ROUNDS} two-way races: exactly one always wins`, noWinner === 0, { noWinner })
  check(`${ROUNDS} two-way races: the loser always gets a clean DATE_TAKEN (never a raw 500)`, wrongError === 0, { wrongError })

  const d8 = nextDate()
  const racers = await Promise.all(Array.from({ length: 8 }, () => mk("PENDING", { date: d8, deposit: "VERIFIED" })))
  const res8 = await Promise.all(racers.map((r) => go(r.id, "CONFIRMED")))
  check("8-way race for one date: exactly 1 OK, 7 DATE_TAKEN", res8.filter((c) => c === "OK").length === 1 && res8.filter((c) => c === "DATE_TAKEN").length === 7, res8)

  // ═════════════════════════════════════════════════════════════
  section("Deposit paths use the same gate, atomically with the audit entry")
  const ok = await mk("PENDING", { deposit: "SUBMITTED" })
  const okPay = (await prisma.payment.findFirst({ where: { bookingId: ok.id } }))!
  const markOk = `${TAG} verify ${ok.id}`
  await auditedTransaction(async (tx, audit) => {
    await verifyDepositPaymentRecord(okPay.id, ok.id, adminId, "ok", tx)
    audit({ userId: adminId, action: "VERIFY", module: "PAYMENT", description: markOk })
  })
  check("verify deposit on a free date → booking CONFIRMED", (await statusOf(ok.id)) === "CONFIRMED")
  check("…payment VERIFIED", (await prisma.payment.findUnique({ where: { id: okPay.id } }))?.status === "VERIFIED")
  check("…exactly one audit entry written", (await prisma.auditLog.count({ where: { description: markOk } })) === 1)
  const savedBy = await prisma.booking.findUnique({ where: { id: ok.id }, select: { depositVerifiedById: true, depositVerifiedAt: true } })
  check("…depositVerified fields set", savedBy?.depositVerifiedById === adminId && !!savedBy.depositVerifiedAt)

  const holder = await mk("CONFIRMED", { deposit: "VERIFIED" })
  const clash = await mk("PENDING", { date: holder.eventDate, deposit: "SUBMITTED" })
  const clashPay = (await prisma.payment.findFirst({ where: { bookingId: clash.id } }))!
  const markClash = `${TAG} verify-blocked ${clash.id}`
  const blocked = await codeOf(() => auditedTransaction(async (tx, audit) => {
    await verifyDepositPaymentRecord(clashPay.id, clash.id, adminId, "x", tx)
    audit({ userId: adminId, action: "VERIFY", module: "PAYMENT", description: markClash })
  }))
  check("verify deposit when another booking holds the date → DATE_TAKEN", blocked === "DATE_TAKEN", blocked)
  check("…the payment is STILL 'SUBMITTED' (rolled back — never verified for an unconfirmable booking)", (await prisma.payment.findUnique({ where: { id: clashPay.id } }))?.status === "SUBMITTED")
  check("…the booking is still PENDING", (await statusOf(clash.id)) === "PENDING")
  check("…and NO audit entry was written", (await prisma.auditLog.count({ where: { description: markClash } })) === 0)

  const before = await prisma.payment.count({ where: { bookingId: clash.id } })
  const manual = await codeOf(() => recordManualPaymentRecord({ bookingId: clash.id, paymentType: "DEPOSIT", method: "CASH", amount: 3000 } as any, adminId))
  check("manual deposit on a held date → DATE_TAKEN", manual === "DATE_TAKEN", manual)
  check("…and no payment row was left behind", (await prisma.payment.count({ where: { bookingId: clash.id } })) === before)

  const race = await mk("PENDING", { deposit: "SUBMITTED" })
  const racePay = (await prisma.payment.findFirst({ where: { bookingId: race.id } }))!
  const rr = await Promise.all([0, 1].map(() => codeOf(() => prisma.$transaction((tx) => verifyDepositPaymentRecord(racePay.id, race.id, adminId, "r", tx)))))
  check("two staff verifying the same payment at once: exactly one succeeds", rr.filter((c) => c === "OK").length === 1, rr)
  check("…the other is told it was already reviewed (or the booking already confirmed)", rr.some((c) => c === "PAYMENT_ALREADY_REVIEWED" || c === "INVALID_STATE"), rr)

  // The booking gate happens to rescue a double-verified DEPOSIT (the second confirm fails). Payment types with NO
  // booking transition depend on the claim alone, so race those directly.
  const balBooking = await mk("CONFIRMED", { deposit: "VERIFIED" })
  const submitFull = () => prisma.payment.create({ data: { bookingId: balBooking.id, paymentType: "FULL_BALANCE", method: "GCASH", amount: 7000, status: "SUBMITTED", submittedAt: new Date() } })
  const fp = await submitFull()
  const twice = await Promise.all([0, 1].map(() => codeOf(() => prisma.$transaction((tx) => verifyFullBalancePaymentRecord(fp.id, adminId, "r", tx)))))
  check("two staff verifying the same FULL-BALANCE payment at once: exactly one succeeds", twice.filter((c) => c === "OK").length === 1 && twice.includes("PAYMENT_ALREADY_REVIEWED"), twice)
  const fp2 = await submitFull()
  const vf = await Promise.all([
    codeOf(() => prisma.$transaction((tx) => verifyFullBalancePaymentRecord(fp2.id, adminId, "v", tx))),
    codeOf(() => prisma.$transaction((tx) => flagPaymentRecord(fp2.id, adminId, "f", tx))),
  ])
  check("verify vs flag racing on one payment: exactly one wins", vf.filter((c) => c === "OK").length === 1 && vf.includes("PAYMENT_ALREADY_REVIEWED"), vf)
  const finalStatus = (await prisma.payment.findUnique({ where: { id: fp2.id } }))?.status
  check("…and the payment ends in a single consistent state (VERIFIED or FLAGGED, not both)", finalStatus === "VERIFIED" || finalStatus === "FLAGGED", finalStatus)

  // ═════════════════════════════════════════════════════════════
  section("Atomic audit — no action without a record")
  const target = await mk("PENDING")
  const marker = `${TAG} atomic ${target.id}`
  const failuresBefore = await prisma.auditWriteFailure.count()
  const atomicResult = await (async () => {
    try {
      await auditedTransaction(async (tx, audit) => {
        await tx.booking.update({ where: { id: target.id }, data: { notes: "CHANGED-BY-ACTION" } })
        audit({ userId: "no-such-user", action: "UPDATE", module: "BOOKING", description: marker })   // violates the userId FK → audit write fails
      })
      return "no error"
    } catch (e) { return e instanceof AuditWriteError ? `AuditWriteError:${e.status}` : `other:${(e as Error).message}` }
  })()
  check("audit write fails → the caller gets AuditWriteError (503)", atomicResult === "AuditWriteError:503", atomicResult)
  check("…and the business change was ROLLED BACK", (await prisma.booking.findUnique({ where: { id: target.id }, select: { notes: true } }))?.notes !== "CHANGED-BY-ACTION")
  check("…and the failure is persisted for the risk engine", (await prisma.auditWriteFailure.count()) === failuresBefore + 1)
  await owner.auditWriteFailure.deleteMany({ where: { description: marker } })

  const bestEffortMarker = `${TAG} best-effort ${Date.now()}`
  const beBefore = await prisma.auditWriteFailure.count()
  let threw = false
  try { await logAction({ userId: "no-such-user", action: "VIEW", module: "REPORT", description: bestEffortMarker }) } catch { threw = true }
  check("best-effort logAction never throws, even when the write fails", !threw)
  const rec = await prisma.auditWriteFailure.findFirst({ where: { description: bestEffortMarker } })
  check("…but retries once and records the failure (attempts = 2)", !!rec && rec.attempts === 2 && (await prisma.auditWriteFailure.count()) === beBefore + 1, rec)
  await owner.auditWriteFailure.deleteMany({ where: { description: bestEffortMarker } })   // this run's deliberate failure — remove it so later checks start clean
  await logAction({ userId: adminId, action: "VIEW", module: "REPORT", description: `${TAG} still works after a failure` })
  const chain = await verifyAuditChainIntegrity()
  check("hash chain is still intact after failed writes (no gaps, no forks)", chain.isValid, chain)


  // ═════════════════════════════════════════════════════════════
  section("Deleted trailing audit entries are detected (tip anchor)")
  const totalAudit = await prisma.auditLog.count()
  const saved = await owner.$queryRaw<{ j: unknown }[]>`SELECT json_agg(t) AS j FROM (SELECT * FROM "AuditLog" ORDER BY sequence DESC LIMIT 3) t`
  check("before tampering the chain is intact and the tip matches", (await verifyAuditChainIntegrity()).tip?.matches === true)
  await owner.$executeRaw`DELETE FROM "AuditLog" WHERE sequence > ${totalAudit - 3}`
  const trunc = await verifyAuditChainIntegrity()
  check("deleting the LAST 3 entries is detected (the old walk-only check said 'intact')", trunc.isValid === false, trunc)
  check("…the message says exactly how many entries are missing", /3 entries were deleted/.test(trunc.reason ?? ""), trunc.reason)
  check("…and the tip record shows recorded #N vs actual #N-3", trunc.tip?.recordedSequence === totalAudit && trunc.tip?.actualSequence === totalAudit - 3, trunc.tip)
  const rk = await getRiskIndicators({ forceChainCheck: true, maxItems: Infinity })
  check("…and the dashboard risk engine raises AUDIT_INTEGRITY (HIGH)", rk.items.some((i) => i.kind === "AUDIT_INTEGRITY" && i.severity === "HIGH"))
  await owner.$executeRaw`INSERT INTO "AuditLog" SELECT * FROM json_populate_recordset(null::"AuditLog", ${JSON.stringify(saved[0].j)}::json)`
  check("after restoring the rows the chain verifies again", (await verifyAuditChainIntegrity()).isValid)

  // ═════════════════════════════════════════════════════════════
  section("System integrity report (/staff/admin/audit/integrity)")
  const rep = await getIntegrityReport()
  const byId = Object.fromEntries(rep.checks.map((c) => [c.id, c]))
  check("five checks are returned", rep.checks.length === 5 && ["audit-chain", "audit-immutable", "one-per-date-index", "rule-violations", "audit-write-failures"].every((id) => byId[id]))
  check("every check has a title and a plain-language summary", rep.checks.every((c) => c.title && c.summary.length > 10))
  check("audit chain: PASS on the intact trail", byId["audit-chain"].status === "pass", byId["audit-chain"])
  check("one-per-date index: PASS (migration applied)", byId["one-per-date-index"].status === "pass", byId["one-per-date-index"])
  const [priv] = await prisma.$queryRaw<{ upd: boolean }[]>`SELECT has_table_privilege(current_user, '"AuditLog"', 'UPDATE') AS upd`
  check(`write-protection reflects THIS connection's real privileges (can UPDATE audit: ${priv.upd})`, (byId["audit-immutable"].status === "pass") === !priv.upd, byId["audit-immutable"])
  check("…and when it is not protected it says what to do", priv.upd ? /create-restricted-role/.test(byId["audit-immutable"].remedy ?? "") : true)
  const [nd] = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "Booking" b WHERE b."status" = 'CONFIRMED' AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p."bookingId" = b."id" AND p."paymentType" = 'DEPOSIT' AND p."status" = 'VERIFIED')`
  check(`rule violations: ${nd.n === 0 ? "PASS" : "FAIL"} — matches the ${nd.n} confirmed-without-deposit record(s) in the data`, byId["rule-violations"].status === (nd.n === 0 ? "pass" : "fail"), byId["rule-violations"])
  check("overall status is the worst of the checks", rep.overall === (rep.checks.some((c) => c.status === "fail") ? "fail" : rep.checks.some((c) => c.status === "warn") ? "warn" : "pass"))

  const ghost = await owner.auditWriteFailure.create({ data: { action: "UPDATE", module: "BOOKING", description: `${TAG} simulated lost entry`, error: "simulated", attempts: 2 } })
  const rep2 = await getIntegrityReport()
  check("a recent audit write failure turns that check to FAIL", rep2.checks.find((c) => c.id === "audit-write-failures")?.status === "fail")
  check("…and the overall verdict to fail", rep2.overall === "fail")
  const rk2 = await getRiskIndicators({ maxItems: Infinity })
  check("…and the dashboard risk engine raises AUDIT_WRITE_FAILED (HIGH)", rk2.items.some((i) => i.kind === "AUDIT_WRITE_FAILED" && i.severity === "HIGH"))
  await owner.auditWriteFailure.delete({ where: { id: ghost.id } })
  check("…both clear once the failure record is gone", (await getIntegrityReport()).checks.find((c) => c.id === "audit-write-failures")?.status === "pass")

  // ═════════════════════════════════════════════════════════════
  section("Account lockout is audited (Clerk webhook handler)")
  const coord = await prisma.user.findFirst({ where: { role: "COORDINATOR" } })
  if (coord) {
    const [first, ...rest] = coord.fullName.split(" ")
    const evt = (locked: boolean) => ({ type: "user.updated", data: {
      id: coord.clerkId, locked, lockout_expires_in_seconds: 600, public_metadata: { role: coord.role },
      email_addresses: coord.email ? [{ email_address: coord.email }] : [], username: coord.username,
      first_name: first, last_name: rest.join(" "),
    } })
    const since = new Date()
    const lockouts = () => prisma.auditLog.count({ where: { userId: coord.id, action: "LOGIN", module: "AUTH", status: "FAILURE", createdAt: { gte: since } } })
    await processClerkEvent(evt(false))
    check("user.updated with locked=false → nothing logged", (await lockouts()) === 0)
    await processClerkEvent(evt(true), { lockoutDedupMinutes: 0 })   // window 0 = "never a duplicate" → deterministic first entry
    check("user.updated with locked=true → ONE failed-LOGIN audit entry", (await lockouts()) === 1)
    const entry = await prisma.auditLog.findFirst({ where: { userId: coord.id, action: "LOGIN", status: "FAILURE", createdAt: { gte: since } } })
    check("…it names the user and records the lockout event", /account locked after repeated failed sign-in attempts/.test(entry?.description ?? "") && (entry?.metadata as any)?.event === "ACCOUNT_LOCKED", entry?.description)
    await processClerkEvent(evt(true)); await processClerkEvent(evt(true))       // default 30-minute window
    check("repeated user.updated while locked → still ONE entry (de-duplicated)", (await lockouts()) === 1)
    const after = await prisma.user.findUnique({ where: { id: coord.id } })
    check("the profile sync in the same event left the user unchanged", after?.fullName === coord.fullName && after?.role === coord.role)
    await processClerkEvent({ type: "session.created", data: { id: "sess_test_integrity", user_id: coord.clerkId } })
    check("session.created is still logged as a successful LOGIN", (await prisma.auditLog.count({ where: { userId: coord.id, action: "LOGIN", status: "SUCCESS", createdAt: { gte: since } } })) >= 1)
  } else console.log("  (no coordinator user — skipped)")

  await cleanup()
  console.log(`\n${"═".repeat(66)}\n  ${passed} passed, ${failures.length} failed  (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
  if (failures.length) { console.log("\n  Failed:"); failures.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
}

main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) }).finally(async () => { await prisma.$disconnect(); await owner.$disconnect() })
