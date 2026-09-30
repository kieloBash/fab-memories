// lib/email/templates/booking-status.ts
//
// Email to the CLIENT when their booking status changes (FR-12).

import { button, callout, detailsTable, esc, hello, layout, longDate, titleCase } from "./layout"

export type BookingStatusKind = "CONFIRMED" | "RESTORED" | "CANCELLED"

export interface BookingStatusEmailData {
  kind: BookingStatusKind
  clientName: string | null
  bookingId: string
  eventType: string
  eventDate: Date | string
  venue?: string | null
  reason?: string | null
}

const COPY: Record<BookingStatusKind, { subject: string; heading: string; line: string }> = {
  CONFIRMED: {
    subject: "Your booking is confirmed",
    heading: "Your booking is confirmed 🎉",
    line: "Great news — your reservation deposit has been verified and your booking is now <strong>confirmed</strong>. The date is reserved for you.",
  },
  RESTORED: {
    subject: "Your booking remains confirmed",
    heading: "Your booking remains confirmed",
    line: "We reviewed your cancellation request and your booking <strong>remains confirmed</strong>. Contact us if you have any questions.",
  },
  CANCELLED: {
    subject: "Your booking was cancelled",
    heading: "Your booking was cancelled",
    line: "Your booking has been <strong>cancelled</strong>. If you think this is a mistake, please contact Fab Memories Events.",
  },
}

export function bookingStatusEmail(d: BookingStatusEmailData) {
  const c = COPY[d.kind]
  const event = `${titleCase(d.eventType)} on ${longDate(d.eventDate)}`
  const rows: [string, unknown][] = [["Event", titleCase(d.eventType)], ["Date", longDate(d.eventDate)]]
  if (d.venue) rows.push(["Venue", d.venue])
  rows.push(["Status", d.kind === "CANCELLED" ? "Cancelled" : "Confirmed"])

  const html = layout({
    heading: c.heading,
    preheader: `${c.subject} — ${event}`,
    bodyHtml: `
      ${hello(d.clientName)}
      <p style="margin:0 0 12px;">${c.line}</p>
      ${detailsTable(rows)}
      ${d.reason ? callout(`<strong>Reason:</strong> ${esc(d.reason)}`, "warn") : ""}
      ${button("View your booking", `/portal/bookings/${d.bookingId}`)}`,
  })

  const text = [
    `Hi ${d.clientName?.trim().split(/\s+/)[0] || "there"},`,
    "",
    c.line.replace(/<[^>]+>/g, ""),
    `Event: ${event}${d.venue ? ` — ${d.venue}` : ""}`,
    ...(d.reason ? [`Reason: ${d.reason}`] : []),
    "",
    `View your booking: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://fab-memories.vercel.app"}/portal/bookings/${d.bookingId}`,
    "",
    "— Fab Memories Events",
  ].join("\n")

  return { subject: `${c.subject} — Fab Memories Events`, html, text }
}
