// app/api/cron/due-date-reminders/route.ts
//
// Notifies clients whose DEPOSIT (Booking.depositDueDate) or INSTALLMENT (Installment.dueDate) is due within
// the next 48 hours and still unpaid (NFR-24). Meant to be hit once a day by a scheduler — see
// docs/NOTIFICATIONS.md for the Vercel Cron config. Not user-authenticated: guarded by a shared secret header,
// since a scheduler has no Clerk session.
//
//   Authorization: Bearer <CRON_SECRET>   (or  x-cron-secret: <CRON_SECRET>)
//
// Idempotent per day: a reminder for the same booking/installment is not sent again within 20 hours, so
// triggering this more than once in a day (a retry, a manual click) does not spam the client.

import { notify } from "@/lib/notifications/notify"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const WINDOW_HOURS = 48
const DEDUP_HOURS = 20

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // refuse to run unconfigured — never silently skip auth
  const auth = req.headers.get("authorization")
  const header = req.headers.get("x-cron-secret")
  return auth === `Bearer ${secret}` || header === secret
}

async function alreadyRemindedRecently(userId: string, link: string): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_HOURS * 3_600_000)
  return (await prisma.notification.count({ where: { userId, type: "PAYMENT_DUE_SOON", link, createdAt: { gte: since } } })) > 0
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const windowEnd = new Date(now.getTime() + WINDOW_HOURS * 3_600_000)
  let sent = 0

  // Deposits due soon, still unverified (a submitted-but-unverified deposit is still "not paid" from the
  // client's point of view for this reminder's purpose)
  const bookings = await prisma.booking.findMany({
    where: { status: "PENDING", depositDueDate: { gte: now, lte: windowEnd } },
    select: { id: true, clientId: true, depositDueDate: true, depositAmount: true, eventType: true },
  })
  for (const b of bookings) {
    const link = `/portal/bookings/${b.id}`
    if (await alreadyRemindedRecently(b.clientId, link)) continue
    await notify({
      userId: b.clientId, type: "PAYMENT_DUE_SOON", title: "Deposit due soon",
      body: `Your deposit of ₱${Number(b.depositAmount).toLocaleString()} for your ${b.eventType.toLowerCase()} booking is due ${b.depositDueDate!.toLocaleDateString("en-PH")}.`,
      link,
    })
    sent++
  }

  // Installments due soon, still unpaid
  const installments = await prisma.installment.findMany({
    where: { status: "UNPAID", dueDate: { gte: now, lte: windowEnd } },
    select: { id: true, order: true, amount: true, dueDate: true, booking: { select: { id: true, clientId: true } } },
  })
  for (const i of installments) {
    const link = `/portal/bookings/${i.booking.id}`
    if (await alreadyRemindedRecently(i.booking.clientId, link)) continue
    await notify({
      userId: i.booking.clientId, type: "PAYMENT_DUE_SOON", title: `Installment #${i.order} due soon`,
      body: `Your installment payment of ₱${Number(i.amount).toLocaleString()} is due ${i.dueDate.toLocaleDateString("en-PH")}.`,
      link,
    })
    sent++
  }

  return NextResponse.json({ ok: true, checked: bookings.length + installments.length, sent })
}
