// e2e/specs/04-payments.spec.ts
//
// Module 4 — Payment Processing and Transaction Management (FR-21 to FR-28; FR-25/26 deferred)
// and TC-FR47-01 (payment proof is access-controlled).
import { expect, test } from "@playwright/test"
import path from "node:path"
import { OPTIONAL } from "../support/env"
import { createBooking, createPackage, daysFromNow, setTerms, submitDeposit, tag, verifyPayment } from "../support/data"
import { openAs, type Actor } from "../support/session"

test.describe.serial("Module 4 — payments", () => {
  let admin: Actor, coordinator: Actor, client: Actor, client2: Actor
  let packageId = ""
  let booking: { id: string }
  let screenshotPaymentId = ""
  let refPaymentId = ""

  test.beforeAll(async ({ browser }) => {
    admin = await openAs(browser, "admin")
    coordinator = await openAs(browser, "coordinator")
    client = await openAs(browser, "client")
    client2 = await openAs(browser, "client2")
    packageId = (await createPackage(admin)).id
    booking = await createBooking(client, packageId)
    await setTerms(admin, booking.id, 30_000)
  })
  test.afterAll(async () => { await Promise.all([admin, coordinator, client, client2].map((a) => a?.close())) })

  test("TC-FR21-03 Invalid proof file is rejected", async () => {
    await client.page.goto(`/portal/bookings/${booking.id}/payment`)
    await client.page.getByRole("tab", { name: /screenshot/i }).first().click()
    await client.page.locator('input[type="file"]').first().setInputFiles({
      name: "not-an-image.txt", mimeType: "text/plain", buffer: Buffer.from("this is not an image"),
    })
    await expect(client.page.getByText(/only jpeg, png, and webp/i).filter({ visible: true }).first()).toBeVisible()
  })

  // test("TC-FR21-01 Client uploads payment proof (screenshot)", async () => {
  //   await client.page.goto(`/portal/bookings/${booking.id}/payment`)
  //   await client.page.getByRole("tab", { name: /screenshot/i }).first().click()
  //   await client.page.locator('input[type="file"]').first().setInputFiles(path.resolve("e2e/fixtures/proof-screenshot.png"))
  //   await client.page.getByRole("button", { name: /upload & submit/i }).first().click()
  //   await expect.poll(async () => {
  //     const r = await client.api.get("/api/payments", { bookingId: booking.id })
  //     const p = (r.json as any[]).find((x) => x.paymentType === "DEPOSIT" && x.proofStoragePath)
  //     screenshotPaymentId = p?.id ?? ""
  //     return p?.status
  //   }, { timeout: 30_000 }).toBe("SUBMITTED")
  // })

  test("TC-FR47-01 Payment proof is access-controlled", async () => {
    const staff = await coordinator.api.get(`/api/payments/${screenshotPaymentId}`)
    expect(staff.status).toBe(200)
    expect(String(staff.json.proofImageUrl ?? "")).toMatch(/token=/) // short-lived signed link, not a public URL
    expect((await client2.api.get(`/api/payments/${screenshotPaymentId}`)).status).toBe(403)
  })

  test("TC-FR23-01 Staff are notified of a submitted proof", async () => {
    const n = await coordinator.api.get("/api/notifications")
    const hit = (n.json?.items ?? []).some((x: any) => x.type === "PAYMENT_SUBMITTED" && String(x.link ?? "").includes(screenshotPaymentId))
    const admins = await admin.api.get("/api/notifications")
    const hitAdmin = (admins.json?.items ?? []).some((x: any) => x.type === "PAYMENT_SUBMITTED" && String(x.link ?? "").includes(screenshotPaymentId))
    expect(hit || hitAdmin).toBe(true)
    const queue = await coordinator.api.get("/api/payments", { status: "SUBMITTED" })
    expect((queue.json as any[]).map((p) => p.id)).toContain(screenshotPaymentId)
  })

  test("TC-FR23-02 Staff flag a payment", async () => {
    const r = await coordinator.api.patch(`/api/payments/${screenshotPaymentId}/verify`, { action: "FLAG", verificationNote: tag("Unclear screenshot") })
    expect(r.status).toBe(200)
    expect(r.json.status).toBe("FLAGGED")
    const n = await client.api.get("/api/notifications")
    expect((n.json?.items ?? []).some((x: any) => x.type === "PAYMENT_FLAGGED")).toBe(true)
  })

  test("TC-FR21-02 Client submits a reference number only", async () => {
    const p = await submitDeposit(client, booking.id, 30_000, tag("GC-REF-001"))
    refPaymentId = p.id
    expect(p.status).toBe("SUBMITTED")
  })

  test("TC-FR22-01 Payment method is recorded", async () => {
    const r = await admin.api.get(`/api/payments/${refPaymentId}`)
    expect(r.json.method).toBe("GCASH")
  })

  test("TC-FR24-01 Staff verify a payment", async () => {
    const r = await verifyPayment(coordinator, refPaymentId)
    expect(r.status).toBe(200)
    expect(r.json.status).toBe("VERIFIED")
    const b = await admin.api.get(`/api/bookings/${booking.id}`)
    expect(b.json.status).toBe("CONFIRMED")
  })

  test("TC-FR28-01 Complete transaction record", async () => {
    const p = (await admin.api.get(`/api/payments/${refPaymentId}`)).json
    for (const k of ["amount", "method", "referenceNumber", "submittedAt", "verifiedAt", "verifiedById"]) {
      expect(p[k], `payment.${k}`).toBeTruthy()
    }
  })

  test("TC-FR24-02 Verified payment cannot be changed", async () => {
    const again = await admin.api.patch(`/api/payments/${refPaymentId}/verify`, { action: "FLAG", verificationNote: "try to change" })
    expect(again.status).toBe(409)
    const del = await admin.api.del(`/api/payments/${refPaymentId}`)
    expect([404, 405]).toContain(del.status)
  })

  test("TC-FR27-01 Installment schedule and running balance", async () => {
    const s = await admin.api.post(`/api/bookings/${booking.id}/installments`, {
      installments: [
        { order: 1, dueDate: daysFromNow(30), amount: 45_000 },
        { order: 2, dueDate: daysFromNow(60), amount: 45_000, note: "Final" },
      ],
    })
    expect(s.status, s.text).toBe(201)
    const list = await client.api.get(`/api/bookings/${booking.id}/installments`)
    expect((list.json as any[]).map((i) => i.status)).toEqual(["UNPAID", "UNPAID"])
    const first = (list.json as any[])[0]
    const pay = await client.api.post("/api/payments", {
      bookingId: booking.id, paymentType: "INSTALLMENT", installmentId: first.id, method: "MAYA", amount: 45_000, referenceNumber: tag("MY-001"),
    })
    expect(pay.status).toBe(201)
    expect((await verifyPayment(coordinator, pay.json.id)).status).toBe(200)
    const after = await client.api.get(`/api/bookings/${booking.id}/installments`)
    expect((after.json as any[])[0].status).toBe("PAID")
  })

  test("TC-FR22-02 Cheque is allowed for deposits only", async () => {
    const list = await client.api.get(`/api/bookings/${booking.id}/installments`)
    const second = (list.json as any[])[1]
    const r = await client.api.post("/api/payments", {
      bookingId: booking.id, paymentType: "INSTALLMENT", installmentId: second.id, method: "CHEQUE", amount: 45_000, referenceNumber: "CHQ-1",
    })
    expect(r.status).toBe(422)
    expect(String(r.json?.error)).toMatch(/cheque/i)
  })

  test("TC-FR27-02 Due-date reminder job runs", async () => {
    test.skip(!OPTIONAL.cronSecret, "Set E2E_CRON_SECRET to run the reminder job test.")
    // Called the way a scheduler would (POST with the secret). Without the secret it must refuse.
    const [without, withSecret] = await admin.page.evaluate(async (secret) => {
      const a = await fetch("/api/cron/due-date-reminders", { method: "POST" })
      const b = await fetch("/api/cron/due-date-reminders", { method: "POST", headers: { "x-cron-secret": secret } })
      return [a.status, b.status]
    }, OPTIONAL.cronSecret)
    expect(without).toBe(401)
    expect(withSecret).toBe(200)
  })
})
