// test-harness/integration/13-ownership.int.test.ts
//
// A CLIENT may only see and act on THEIR OWN bookings and payments.
// Ben (client) tries every client-facing route against Anna's booking. Each must be refused.
//
// Two of these fail on the current code — they are real access-control gaps (see test-harness/FINDINGS.md #3 and #4):
//   • GET  /api/payments?bookingId=<someone else's>   lists another client's payments
//   • POST /api/payments  { bookingId: <someone else's> } records a payment on another client's booking
import { GET as bookingGET, PATCH as bookingPATCH } from "@/app/api/bookings/[bookingId]/route"
import { POST as cancelPOST } from "@/app/api/bookings/[bookingId]/cancel-request/route"
import { GET as historyGET } from "@/app/api/bookings/[bookingId]/history/route"
import { GET as instGET } from "@/app/api/bookings/[bookingId]/installments/route"
import { GET as bvGET } from "@/app/api/bookings/[bookingId]/vendors/route"
import { GET as paymentGET } from "@/app/api/payments/[paymentId]/route"
import { GET as paymentsGET, POST as paymentsPOST } from "@/app/api/payments/route"
import { prisma } from "@/lib/prisma"
import { beforeAll, describe, expect, it } from "vitest"
import { makeConfirmedBooking, makePackage, seedUsers } from "./_support/factories"
import { call } from "./_support/http"
import { actAs } from "./_support/session"

let annaBookingId = ""
let annaPaymentId = ""

beforeAll(async () => {
  const users = await seedUsers()
  const pkg = await makePackage()
  const b = await makeConfirmedBooking({ clientId: users.anna.id, packageId: pkg.id, adminId: users.admin.id })
  annaBookingId = b.id
  annaPaymentId = (await prisma.payment.findFirstOrThrow({ where: { bookingId: b.id } })).id
})

describe("Ownership — Ben cannot reach Anna's booking", () => {
  it("open the booking → 403", async () => {
    actAs("client_ben")
    expect((await call(bookingGET, { params: { bookingId: annaBookingId } })).status).toBe(403)
  })
  it("edit the booking → 403", async () => {
    actAs("client_ben")
    expect((await call(bookingPATCH, { method: "PATCH", params: { bookingId: annaBookingId }, body: { guestCount: 5 } })).status).toBe(403)
  })
  it("read its history → 403", async () => {
    actAs("client_ben")
    expect((await call(historyGET, { params: { bookingId: annaBookingId } })).status).toBe(403)
  })
  it("read its installments → 403", async () => {
    actAs("client_ben")
    expect((await call(instGET, { params: { bookingId: annaBookingId } })).status).toBe(403)
  })
  it("read its vendors → 403", async () => {
    actAs("client_ben")
    expect((await call(bvGET, { params: { bookingId: annaBookingId } })).status).toBe(403)
  })
  it("request its cancellation → 403", async () => {
    actAs("client_ben")
    expect((await call(cancelPOST, { params: { bookingId: annaBookingId }, body: { reason: "I want to cancel someone else's event" } })).status).toBe(403)
  })
  it("open one of its payments → 403", async () => {
    actAs("client_ben")
    expect((await call(paymentGET, { params: { paymentId: annaPaymentId } })).status).toBe(403)
  })

  it("[FINDING #3] list its payments with ?bookingId= → 403", async () => {
    actAs("client_ben")
    const r = await call(paymentsGET, { query: { bookingId: annaBookingId } })
    expect(r.status, `returned ${r.status} with ${Array.isArray(r.json) ? r.json.length : "?"} of Anna's payments`).toBe(403)
  })

  it("[FINDING #4] submit a payment against it → 403, and nothing is recorded", async () => {
    actAs("client_ben")
    const before = await prisma.payment.count({ where: { bookingId: annaBookingId } })
    const r = await call(paymentsPOST, { body: { bookingId: annaBookingId, paymentType: "FULL_BALANCE", method: "GCASH", amount: 1, referenceNumber: "ITEST-NOT-MINE" } })
    expect(r.status).toBe(403)
    expect(await prisma.payment.count({ where: { bookingId: annaBookingId } })).toBe(before)
  })
})
