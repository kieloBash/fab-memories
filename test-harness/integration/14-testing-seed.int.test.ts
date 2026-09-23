// test-harness/integration/14-testing-seed.int.test.ts
//
// Proves the MANUAL test guide works: seeds scenarios T1–T6 (prisma/seeds/04-testing.ts), performs the first action
// each section of tests/INTEGRATION_AND_MANUAL_TEST_GUIDE.md asks the tester to do — through the real routes — and
// removes the scenarios again. If this passes, a tester following the guide will not hit a dead end.
import { PATCH as bookingPATCH } from "@/app/api/bookings/[bookingId]/route"
import { PATCH as termsPATCH } from "@/app/api/bookings/[bookingId]/contract-terms/route"
import { GET as instGET } from "@/app/api/bookings/[bookingId]/installments/route"
import { GET as staffGET } from "@/app/api/bookings/[bookingId]/staff/route"
import { PATCH as verifyPATCH } from "@/app/api/payments/[paymentId]/verify/route"
import { POST as paymentsPOST } from "@/app/api/payments/route"
import { GET as briefGET } from "@/app/api/vendor-brief/[bookingId]/route"
import { prisma } from "@/lib/prisma"
import { reset as resetTesting, run as runTesting } from "@/prisma/seeds/04-testing"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { daysFromNow } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { actAs, signOut } from "./_support/session"

const ids: Record<string, string> = {}

beforeAll(async () => {
  await runTesting()
  for (const b of await prisma.booking.findMany({ where: { staffNote: { startsWith: "[seed:testing]" } } })) {
    ids[b.staffNote!.split(" ")[1]] = b.id
  }
})
afterAll(async () => { await resetTesting() })

describe("Manual-test scenarios (seed: testing) are playable", () => {
  it("seeded all six", () => expect(Object.keys(ids).sort()).toEqual(["T1", "T2", "T3", "T4", "T5", "T6"]))

  it("T1 — staff can set the contract terms", async () => {
    actAs("admin")
    expectStatus(await call(termsPATCH, { method: "PATCH", params: { bookingId: ids.T1 }, body: { paymentPlan: "FULL", depositAmount: 20_000, depositDueDate: daysFromNow(7) } }), 200)
  })

  it("T2 — verifying the submitted deposit confirms the booking", async () => {
    const p = await prisma.payment.findFirstOrThrow({ where: { bookingId: ids.T2, status: "SUBMITTED" } })
    actAs("coordinator")
    expectStatus(await call(verifyPATCH, { method: "PATCH", params: { paymentId: p.id }, body: { action: "VERIFY" } }), 200)
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: ids.T2 } })).status).toBe("CONFIRMED")
  })

  it("T3 — the client can pay installment #1 and staff can verify it", async () => {
    actAs("client_ben")
    const list = await call(instGET, { params: { bookingId: ids.T3 } })
    expect(list.json).toHaveLength(2)
    const first = list.json[0]
    const p = await call(paymentsPOST, { body: { bookingId: ids.T3, paymentType: "INSTALLMENT", installmentId: first.id, method: "GCASH", amount: Number(first.amount), referenceNumber: "TEST-I1" } })
    expectStatus(p, 201)
    actAs("admin")
    expectStatus(await call(verifyPATCH, { method: "PATCH", params: { paymentId: p.json.id }, body: { action: "VERIFY" } }), 200)
  })

  it("T4 — staff can decline the cancellation request (booking stays confirmed)", async () => {
    actAs("admin")
    const r = await call(bookingPATCH, { method: "PATCH", params: { bookingId: ids.T4 }, body: { status: "CONFIRMED" } })
    expectStatus(r, 200)
    expect(r.json.status).toBe("CONFIRMED")
  })

  it("T5 — the staffing banner is below recommendation, and the vendor brief link opens", async () => {
    actAs("admin")
    const c = await call(staffGET, { params: { bookingId: ids.T5 }, query: { compliance: "true" } })
    expect(c.json).toMatchObject({ guestCount: 60, assignedCount: 1, isCompliant: false })
    const bv = await prisma.bookingVendor.findFirst({ where: { bookingId: ids.T5 } })
    signOut()
    const brief = await call(briefGET, { params: { bookingId: ids.T5 }, query: bv ? { view: bv.id } : {} })
    expectStatus(brief, 200)
  })

  it("T6 — the client can resubmit the flagged deposit", async () => {
    actAs("client_ben")
    const b = await prisma.booking.findUniqueOrThrow({ where: { id: ids.T6 } })
    expectStatus(await call(paymentsPOST, { body: { bookingId: ids.T6, paymentType: "DEPOSIT", method: "MAYA", amount: Number(b.depositAmount), referenceNumber: "TEST-RESUBMIT" } }), 201)
  })
})
