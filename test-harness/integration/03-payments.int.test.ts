// test-harness/integration/03-payments.int.test.ts
//
// Module 3 — Payments: proof submission (screenshot and reference), verification, flagging, full-balance, manual entry.
import { GET as paymentGET } from "@/app/api/payments/[paymentId]/route"
import { PATCH as verifyPATCH } from "@/app/api/payments/[paymentId]/verify/route"
import { POST as manualPOST } from "@/app/api/payments/manual/route"
import { GET as paymentsGET, POST as paymentsPOST } from "@/app/api/payments/route"
import { prisma } from "@/lib/prisma"
import { beforeAll, describe, expect, it } from "vitest"
import { makeBooking, makeConfirmedBooking, makePackage, seedUsers } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { storageLog } from "./_support/mocks/storage"
import { actAs } from "./_support/session"

let users: Awaited<ReturnType<typeof seedUsers>>
let pkgId = ""
beforeAll(async () => {
  users = await seedUsers()
  pkgId = (await makePackage()).id
})

describe.sequential("Payments — FULL plan: deposit by screenshot, then the balance", () => {
  let bookingId = ""
  let depositId = ""

  it("CLIENT submits the deposit with an uploaded screenshot → SUBMITTED", async () => {
    bookingId = (await makeBooking({ clientId: users.anna.id, packageId: pkgId, paymentPlan: "FULL", depositAmount: 25_000 })).id
    actAs("client_anna")
    const r = await call(paymentsPOST, {
      body: { bookingId, paymentType: "DEPOSIT", method: "BANK_TRANSFER", amount: 25_000, proofStoragePath: `${bookingId}/deposit/itest.jpg` },
    })
    expectStatus(r, 201)
    expect(r.json.status).toBe("SUBMITTED")
    depositId = r.json.id
  })

  it("staff open it and get a SIGNED url for the private proof image", async () => {
    actAs("coordinator")
    const r = await call(paymentGET, { params: { paymentId: depositId } })
    expectStatus(r, 200)
    expect(r.json.proofImageUrl).toMatch(/^https:\/\/storage\.test\/.+token=itest$/)
    expect(storageLog.signed).toContain(`${bookingId}/deposit/itest.jpg`)
  })

  it("the CLIENT lists their booking's payments", async () => {
    actAs("client_anna")
    const r = await call(paymentsGET, { query: { bookingId } })
    expectStatus(r, 200)
    expect(r.json.map((p: any) => p.id)).toEqual([depositId])
  })

  it("COORDINATOR verifies the deposit → VERIFIED and the booking CONFIRMED in the same transaction", async () => {
    actAs("coordinator")
    const r = await call(verifyPATCH, { method: "PATCH", params: { paymentId: depositId }, body: { action: "VERIFY" } })
    expectStatus(r, 200)
    expect(r.json).toMatchObject({ status: "VERIFIED", verifiedById: users.coordinator.id })
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe("CONFIRMED")
  })

  it("CLIENT pays the full balance by reference number; ADMIN verifies it", async () => {
    actAs("client_anna")
    const p = await call(paymentsPOST, { body: { bookingId, paymentType: "FULL_BALANCE", method: "GCASH", amount: 75_000, referenceNumber: "ITEST-BAL-1" } })
    expectStatus(p, 201)
    actAs("admin")
    const v = await call(verifyPATCH, { method: "PATCH", params: { paymentId: p.json.id }, body: { action: "VERIFY", verificationNote: "Balance received" } })
    expectStatus(v, 200)
    expect(v.json).toMatchObject({ status: "VERIFIED", paymentType: "FULL_BALANCE", verificationNote: "Balance received" })
  })

  it("staff list payments filtered by status and type", async () => {
    actAs("admin")
    const r = await call(paymentsGET, { query: { status: "VERIFIED", paymentType: "FULL_BALANCE", bookingId } })
    expectStatus(r, 200)
    expect(r.json).toHaveLength(1)
  })
})

describe("Payments — flagging a bad proof", () => {
  it("staff FLAG a submission → FLAGGED, the client is notified (and e-mailed)", async () => {
    const b = await makeBooking({ clientId: users.anna.id, packageId: pkgId })
    actAs("client_anna")
    const p = await call(paymentsPOST, { body: { bookingId: b.id, paymentType: "DEPOSIT", method: "MAYA", amount: 25_000, referenceNumber: "ITEST-BLURRY" } })
    expectStatus(p, 201)
    actAs("admin")
    const r = await call(verifyPATCH, { method: "PATCH", params: { paymentId: p.json.id }, body: { action: "FLAG", verificationNote: "Reference not found" } })
    expectStatus(r, 200)
    expect(r.json.status).toBe("FLAGGED")
    const n = await prisma.notification.findFirst({ where: { userId: users.anna.id, type: "PAYMENT_FLAGGED", link: { contains: b.id } } })
    expect(n?.body).toContain("Reference not found")
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("PENDING") // unchanged
  })
})

describe("Payments — manual (face-to-face) entries", () => {
  it("ADMIN records a CASH deposit for a pending booking → VERIFIED and the booking CONFIRMED", async () => {
    const b = await makeBooking({ clientId: users.ben.id, packageId: pkgId })
    actAs("admin")
    const r = await call(manualPOST, { body: { bookingId: b.id, paymentType: "DEPOSIT", method: "CASH", amount: 25_000 } })
    expectStatus(r, 201)
    expect(r.json).toMatchObject({ status: "VERIFIED", verificationNote: "Manual payment recorded by staff" })
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("CONFIRMED")
  })

  it("COORDINATOR records a full-balance CHEQUE payment for a confirmed booking", async () => {
    const b = await makeConfirmedBooking({ clientId: users.ben.id, packageId: pkgId, adminId: users.admin.id })
    actAs("coordinator")
    const r = await call(manualPOST, { body: { bookingId: b.id, paymentType: "FULL_BALANCE", method: "CHEQUE", amount: 75_000, referenceNumber: "CHQ-0091" } })
    expectStatus(r, 201)
    expect(r.json).toMatchObject({ status: "VERIFIED", paymentType: "FULL_BALANCE" })
  })
})
