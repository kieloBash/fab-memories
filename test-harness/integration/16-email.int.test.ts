// test-harness/integration/16-email.int.test.ts
//
// The administrator's email checks: send a test email, and read the EmailLog.
// (sendEmail itself is replaced by the capture stand-in here; the real sender and its EmailLog writes are
// covered by test-harness/unit/email-send.unit.test.ts.)
import { GET as logGET } from "@/app/api/admin/email/log/route"
import { POST as testPOST } from "@/app/api/admin/email/test/route"
import { prisma } from "@/lib/prisma"
import { describe, expect, it } from "vitest"
import { RUN, seedUsers } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { sentEmails } from "./_support/mocks/email"
import { actAs } from "./_support/session"

describe.sequential("Admin email checks", () => {
  it("ADMIN sends a test email to a chosen address → 200, reported mode, message captured", async () => {
    await seedUsers()
    actAs("admin")
    const before = sentEmails.length
    const r = await call(testPOST, { body: { to: "itest.inbox@example.com" } })
    expectStatus(r, 200)
    expect(r.json).toMatchObject({ sent: true, mode: "console", to: "itest.inbox@example.com" })
    const m = sentEmails.slice(before).find((x) => x.to === "itest.inbox@example.com")
    expect(m?.kind).toBe("TEST")
    expect(m?.html).toContain("Email delivery test")
  })

  it("an invalid address → 422", async () => {
    actAs("admin")
    expectStatus(await call(testPOST, { body: { to: "not-an-email" } }), 422)
  })

  it("COORDINATOR and CLIENT cannot use either route → 403", async () => {
    for (const who of ["coordinator", "client_anna"]) {
      actAs(who)
      expectStatus(await call(testPOST, { body: {} }), 403)
      expectStatus(await call(logGET), 403)
    }
  })

  it("the log lists entries newest first and filters by recipient and kind", async () => {
    const to = `${RUN.toLowerCase()}.log@example.com`
    await prisma.emailLog.create({ data: { to, subject: "old", kind: "PAYMENT_VERIFIED", status: "SENT", mode: "gmail-oauth2", createdAt: new Date(Date.now() - 60_000) } })
    await prisma.emailLog.create({ data: { to, subject: "new", kind: "BOOKING_CONFIRMED", status: "SENT", mode: "gmail-oauth2" } })

    actAs("admin")
    const all = await call(logGET, { query: { to } })
    expectStatus(all, 200)
    expect(all.json.entries.map((e: any) => e.subject)).toEqual(["new", "old"])

    const confirmed = await call(logGET, { query: { to, kind: "BOOKING_CONFIRMED" } })
    expect(confirmed.json.entries).toHaveLength(1)
    expect(confirmed.json.entries[0]).toMatchObject({ status: "SENT", mode: "gmail-oauth2" })

    await prisma.emailLog.deleteMany({ where: { to } })
  })
})
