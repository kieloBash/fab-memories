// e2e/specs/11-email.spec.ts
//
// EMAIL DELIVERY on the live site (FR-12, NFR-24) — "was the email really sent?"
//
// Every email attempt is recorded in the EmailLog (lib/email/send.ts). These tests trigger real actions,
// then read the log through GET /api/admin/email/log and check that the right email was SENT — i.e. accepted
// by Gmail, not just printed to the server log ("LOGGED", meaning no Gmail credentials on the server).
//
// Tip: give the TEST client account a real inbox, then open it after the run to see the emails themselves.
import { expect, test } from "@playwright/test"
import { CREDENTIALS } from "../support/env"
import { createBooking, createPackage, setTerms, submitDeposit, tag, verifyPayment } from "../support/data"
import { openAs, type Actor } from "../support/session"

test.describe("Email delivery", () => {
  let admin: Actor, coordinator: Actor, client: Actor
  let packageId = ""
  let clientEmail = ""

  test.beforeAll(async ({ browser }) => {
    clientEmail = CREDENTIALS.client.identifier
    admin = await openAs(browser, "admin")
    coordinator = await openAs(browser, "coordinator")
    client = await openAs(browser, "client")
    packageId = (await createPackage(admin)).id
  })
  test.afterAll(async () => { await Promise.all([admin, coordinator, client].map((a) => a?.close())) })

  /** Waits until the EmailLog has an entry of this kind for this recipient (created after `since`). */
  async function expectEmail(kind: string, since: string, bookingId?: string) {
    let entry: any
    await expect.poll(async () => {
      const r = await admin.api.get("/api/admin/email/log", { to: clientEmail, kind, since, ...(bookingId ? { bookingId } : {}), limit: 5 })
      expect(r.status).toBe(200)
      entry = r.json.entries[0]
      return entry?.status ?? "none"
    }, { timeout: 30_000, message: `no ${kind} email logged for ${clientEmail}` }).not.toBe("none")
    expect(entry.status, `${kind} email status (LOGGED = no Gmail credentials on the server, FAILED = Gmail refused: ${entry.error ?? ""})`).toBe("SENT")
    expect(entry.messageId, "Gmail message id").toBeTruthy()
    return entry
  }

  test("TC-EMAIL-01 The server can send email (test email through Gmail)", async () => {
    const r = await admin.api.post("/api/admin/email/test", { to: clientEmail })
    expect(r.json?.mode, "mode 'console' means GMAIL_* variables are missing in Vercel").not.toBe("console")
    expect(r.status, r.text).toBe(200)
    expect(r.json).toMatchObject({ sent: true, to: clientEmail })
    expect(r.json.messageId).toBeTruthy()
  })

  test("TC-EMAIL-02 Verifying a deposit emails the client: booking confirmed + payment verified", async () => {
    const since = new Date().toISOString()
    const b = await createBooking(client, packageId)
    await setTerms(admin, b.id)
    const dep = await submitDeposit(client, b.id)
    expect((await verifyPayment(admin, dep.id)).status).toBe(200)
    await expectEmail("BOOKING_CONFIRMED", since, b.id)
    await expectEmail("PAYMENT_VERIFIED", since, b.id)
  })

  test("TC-EMAIL-03 Flagging a payment emails the client", async () => {
    const since = new Date().toISOString()
    const b = await createBooking(client, packageId)
    await setTerms(admin, b.id)
    const dep = await submitDeposit(client, b.id)
    const r = await coordinator.api.patch(`/api/payments/${dep.id}/verify`, { action: "FLAG", verificationNote: tag("Blurry screenshot") })
    expect(r.status).toBe(200)
    await expectEmail("PAYMENT_FLAGGED", since, b.id)
  })

  test("TC-EMAIL-04 Declining a booking emails the client", async () => {
    const since = new Date().toISOString()
    const b = await createBooking(client, packageId)
    const r = await admin.api.patch(`/api/bookings/${b.id}`, { status: "CANCELLED", cancellationReason: tag("Date unavailable") })
    expect(r.status).toBe(200)
    await expectEmail("BOOKING_CANCELLED", since, b.id)
  })

  test("TC-EMAIL-05 Only the administrator can send test emails or read the email log", async () => {
    expect((await coordinator.api.post("/api/admin/email/test", {})).status).toBe(403)
    expect((await coordinator.api.get("/api/admin/email/log")).status).toBe(403)
    expect((await client.api.get("/api/admin/email/log")).status).toBe(403)
  })
})
