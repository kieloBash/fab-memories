// test-harness/integration/10-notifications.int.test.ts
//
// Notifications: the bell's list, mark-one / mark-all read, the due-date reminder cron, and the client e-mails
// sent when a booking's status changes (FR-12) or a payment is verified.
import { POST as cronPOST } from "@/app/api/cron/due-date-reminders/route"
import { PATCH as verifyPATCH } from "@/app/api/payments/[paymentId]/verify/route"
import { POST as markAllPOST } from "@/app/api/notifications/mark-all-read/route"
import { PATCH as markOnePATCH } from "@/app/api/notifications/[id]/route"
import { GET as listGET } from "@/app/api/notifications/route"
import { prisma } from "@/lib/prisma"
import { beforeAll, describe, expect, it } from "vitest"
import { makeBooking, makePackage, makePayment, seedUsers } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { sentEmails } from "./_support/mocks/email"
import { actAs } from "./_support/session"

let users: Awaited<ReturnType<typeof seedUsers>>
beforeAll(async () => { users = await seedUsers() })

describe.sequential("Notifications", () => {
  let bookingId = ""

  it("the cron job reminds a client whose deposit is due within 48h (notification + e-mail)", async () => {
    const pkg = await makePackage()
    const b = await makeBooking({ clientId: users.anna.id, packageId: pkg.id })
    await prisma.booking.update({ where: { id: b.id }, data: { depositDueDate: new Date(Date.now() + 24 * 3_600_000) } })
    bookingId = b.id
    const before = sentEmails.length

    const r = await call(cronPOST, { headers: { authorization: "Bearer itest-cron-secret" }, body: {} })
    expectStatus(r, 200)
    const n = await prisma.notification.findFirst({ where: { userId: users.anna.id, type: "PAYMENT_DUE_SOON", link: { contains: bookingId } } })
    expect(n).not.toBeNull()
    expect(sentEmails.slice(before).some((m) => m.to === users.anna.email)).toBe(true)
  })

  it("running the cron again the same day does not remind twice", async () => {
    await call(cronPOST, { headers: { "x-cron-secret": "itest-cron-secret" }, body: {} })
    expect(await prisma.notification.count({ where: { userId: users.anna.id, type: "PAYMENT_DUE_SOON", link: { contains: bookingId } } })).toBe(1)
  })

  it("the client's bell lists it as unread; marking it read updates the count", async () => {
    actAs("client_anna")
    const list = await call(listGET)
    expectStatus(list, 200)
    const n = list.json.items.find((x: any) => x.link?.includes(bookingId))
    expect(n.isRead).toBe(false)
    const unread = list.json.unreadCount
    expectStatus(await call(markOnePATCH, { method: "PATCH", params: { id: n.id } }), 200)
    expect((await call(listGET)).json.unreadCount).toBe(unread - 1)
  })

  it("mark-all-read clears the badge", async () => {
    actAs("client_anna")
    expectStatus(await call(markAllPOST, { body: {} }), 200)
    expect((await call(listGET)).json.unreadCount).toBe(0)
  })
})

describe.sequential("Client e-mails on status change (FR-12) and verified payments", () => {
  it("verifying a deposit e-mails the client: booking confirmed + payment verified", async () => {
    const pkg = await makePackage()
    const b = await makeBooking({ clientId: users.anna.id, packageId: pkg.id })
    const dep = await makePayment({ bookingId: b.id, amount: 25_000 })
    const before = sentEmails.length

    actAs("admin")
    const r = await call(verifyPATCH, { method: "PATCH", params: { paymentId: dep.id }, body: { action: "VERIFY" } })
    expectStatus(r, 200)

    const mine = sentEmails.slice(before).filter((m) => m.to === users.anna.email)
    expect(mine.some((m) => /booking is confirmed/i.test(m.subject))).toBe(true)
    expect(mine.some((m) => /payment verified/i.test(m.subject))).toBe(true)
  })

  it("flagging a payment does NOT send the 'verified' e-mail", async () => {
    const pkg = await makePackage()
    const b = await makeBooking({ clientId: users.anna.id, packageId: pkg.id })
    const dep = await makePayment({ bookingId: b.id, amount: 25_000 })
    const before = sentEmails.length
    actAs("admin")
    expectStatus(await call(verifyPATCH, { method: "PATCH", params: { paymentId: dep.id }, body: { action: "FLAG", verificationNote: "blurry" } }), 200)
    expect(sentEmails.slice(before).some((m) => /payment verified/i.test(m.subject))).toBe(false)
  })
})
