// test-harness/integration/04-installments.int.test.ts
//
// Module 3 — Installment schedules: set, pay, verify, and RE-schedule without touching what is already paid.
import { GET as instGET, POST as instPOST } from "@/app/api/bookings/[bookingId]/installments/route"
import { PATCH as verifyPATCH } from "@/app/api/payments/[paymentId]/verify/route"
import { POST as manualPOST } from "@/app/api/payments/manual/route"
import { POST as paymentsPOST } from "@/app/api/payments/route"
import { beforeAll, describe, expect, it } from "vitest"
import { daysFromNow, makeConfirmedBooking, makePackage, seedUsers } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { actAs } from "./_support/session"

describe.sequential("Installments — schedule → pay → reschedule the rest", () => {
  let bookingId = ""
  let ids: string[] = []

  beforeAll(async () => {
    const users = await seedUsers()
    const pkg = await makePackage()
    bookingId = (await makeConfirmedBooking({
      clientId: users.anna.id, packageId: pkg.id, adminId: users.admin.id, paymentPlan: "INSTALLMENT", agreedPrice: 100_000, depositAmount: 25_000,
    })).id
  })

  it("ADMIN sets 3 monthly installments for the ₱75,000 balance", async () => {
    actAs("admin")
    const r = await call(instPOST, {
      params: { bookingId },
      body: { installments: [1, 2, 3].map((order) => ({ order, dueDate: daysFromNow(30 * order), amount: 25_000 })) },
    })
    expectStatus(r, 201)
    expect(r.json.count).toBe(3)
  })

  it("CLIENT and staff see them in order, all UNPAID", async () => {
    for (const who of ["client_anna", "coordinator"]) {
      actAs(who)
      const r = await call(instGET, { params: { bookingId } })
      expectStatus(r, 200)
      expect(r.json.map((i: any) => `${i.order}:${i.status}`)).toEqual(["1:UNPAID", "2:UNPAID", "3:UNPAID"])
      ids = r.json.map((i: any) => i.id)
    }
  })

  it("CLIENT pays #1; staff verify → #1 PAID, its latest payment is attached", async () => {
    actAs("client_anna")
    const p = await call(paymentsPOST, { body: { bookingId, paymentType: "INSTALLMENT", installmentId: ids[0], method: "GCASH", amount: 25_000, referenceNumber: "ITEST-I1" } })
    expectStatus(p, 201)
    actAs("admin")
    expectStatus(await call(verifyPATCH, { method: "PATCH", params: { paymentId: p.json.id }, body: { action: "VERIFY" } }), 200)
    const r = await call(instGET, { params: { bookingId } })
    expect(r.json[0]).toMatchObject({ order: 1, status: "PAID" })
    expect(r.json[0].payments[0]).toMatchObject({ status: "VERIFIED", referenceNumber: "ITEST-I1" })
  })

  it("ADMIN re-schedules the remaining ₱50,000 as two payments → #1 stays PAID, new rows continue at #2", async () => {
    actAs("admin")
    const r = await call(instPOST, {
      params: { bookingId },
      body: { installments: [{ order: 1, dueDate: daysFromNow(45), amount: 30_000 }, { order: 2, dueDate: daysFromNow(90), amount: 20_000 }] },
    })
    expectStatus(r, 201)
    const list = await call(instGET, { params: { bookingId } })
    expect(list.json.map((i: any) => `${i.order}:${i.status}:${Number(i.amount)}`)).toEqual(["1:PAID:25000", "2:UNPAID:30000", "3:UNPAID:20000"])
  })

  it("ADMIN records #2 as a manual BANK_TRANSFER → PAID", async () => {
    actAs("admin")
    const list = await call(instGET, { params: { bookingId } })
    const second = list.json.find((i: any) => i.order === 2)
    const r = await call(manualPOST, { body: { bookingId, paymentType: "INSTALLMENT", installmentId: second.id, method: "BANK_TRANSFER", amount: 30_000 } })
    expectStatus(r, 201)
    const after = await call(instGET, { params: { bookingId } })
    expect(after.json.find((i: any) => i.order === 2).status).toBe("PAID")
  })
})
