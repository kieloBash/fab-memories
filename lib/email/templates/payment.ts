// lib/email/templates/payment.ts
//
// Emails to the CLIENT about one of their payments: verified by staff, or flagged for attention.

import { button, callout, detailsTable, esc, hello, layout, longDate, methodLabel, peso, titleCase } from "./layout"

export interface PaymentEmailData {
  clientName: string | null
  bookingId: string
  eventType: string
  eventDate: Date | string
  paymentType: string
  amount: number | string
  method: string
  note?: string | null
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://fab-memories.vercel.app"
const first = (n: string | null) => n?.trim().split(/\s+/)[0] || "there"

export function paymentVerifiedEmail(d: PaymentEmailData) {
  const type = titleCase(d.paymentType)
  const html = layout({
    heading: "Payment verified ✅",
    preheader: `Your ${type.toLowerCase()} payment of ${peso(d.amount)} has been verified`,
    bodyHtml: `
      ${hello(d.clientName)}
      <p style="margin:0 0 12px;">Your payment has been <strong>verified</strong> by Fab Memories Events. Thank you!</p>
      ${detailsTable([
        ["Payment", type],
        ["Amount", peso(d.amount)],
        ["Method", methodLabel(d.method)],
        ["Event", `${titleCase(d.eventType)} — ${longDate(d.eventDate)}`],
      ])}
      ${button("See your payment history", `/portal/bookings/${d.bookingId}`)}`,
  })
  const text = [
    `Hi ${first(d.clientName)},`,
    "",
    `Your ${type.toLowerCase()} payment of ${peso(d.amount)} (${methodLabel(d.method)}) has been verified.`,
    `Event: ${titleCase(d.eventType)} on ${longDate(d.eventDate)}`,
    "",
    `See your payment history: ${appUrl()}/portal/bookings/${d.bookingId}`,
    "",
    "— Fab Memories Events",
  ].join("\n")
  return { subject: "Payment verified — Fab Memories Events", html, text }
}

export function paymentFlaggedEmail(d: PaymentEmailData) {
  const type = titleCase(d.paymentType)
  const html = layout({
    heading: "A payment needs your attention",
    preheader: `Your ${type.toLowerCase()} payment could not be verified yet`,
    bodyHtml: `
      ${hello(d.clientName)}
      <p style="margin:0 0 12px;">We could not verify one of your payments yet. Please check the note below and submit a clearer proof or the correct amount.</p>
      ${detailsTable([
        ["Payment", type],
        ["Amount", peso(d.amount)],
        ["Method", methodLabel(d.method)],
        ["Event", `${titleCase(d.eventType)} — ${longDate(d.eventDate)}`],
      ])}
      ${d.note ? callout(`<strong>Note from our team:</strong> ${esc(d.note)}`, "warn") : ""}
      ${button("Review the payment", `/portal/bookings/${d.bookingId}`)}`,
  })
  const text = [
    `Hi ${first(d.clientName)},`,
    "",
    `We could not verify your ${type.toLowerCase()} payment of ${peso(d.amount)} (${methodLabel(d.method)}) yet.`,
    ...(d.note ? [`Note from our team: ${d.note}`] : []),
    `Event: ${titleCase(d.eventType)} on ${longDate(d.eventDate)}`,
    "",
    `Review the payment: ${appUrl()}/portal/bookings/${d.bookingId}`,
    "",
    "— Fab Memories Events",
  ].join("\n")
  return { subject: "A payment needs your attention — Fab Memories Events", html, text }
}
