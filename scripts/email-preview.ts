// scripts/email-preview.ts
//
// Writes every email template to email-previews/*.html with sample data, so you can open them in a browser
// (and screenshot them for the paper) without sending anything.
//
//   npm run email:preview

import fs from "node:fs"
import path from "node:path"
import { bookingStatusEmail, notificationEmail, paymentFlaggedEmail, paymentVerifiedEmail, testEmail } from "@/lib/email/templates"

const out = path.resolve("email-previews")
fs.mkdirSync(out, { recursive: true })

const booking = { clientName: "Maria Clara Santos", bookingId: "sample-booking-id", eventType: "WEDDING", eventDate: "2027-02-14", venue: "Garden Pavilion, Tagaytay" }
const payment = { ...booking, paymentType: "DEPOSIT", amount: 30000, method: "GCASH" }

const samples: Record<string, { subject: string; html: string; text: string }> = {
  "booking-confirmed": bookingStatusEmail({ kind: "CONFIRMED", ...booking }),
  "booking-restored": bookingStatusEmail({ kind: "RESTORED", ...booking }),
  "booking-cancelled": bookingStatusEmail({ kind: "CANCELLED", ...booking, reason: "Venue unavailable on this date" }),
  "payment-verified": paymentVerifiedEmail(payment),
  "payment-flagged": paymentFlaggedEmail({ ...payment, note: "The screenshot is blurry — please upload a clearer one." }),
  "notification-generic": notificationEmail({ title: "New payment proof submitted", body: "A client submitted a deposit payment for a wedding on 14 February 2027.", link: "/staff/admin/payments" }),
  "test-email": testEmail({ requestedBy: "System Administrator", mode: "gmail-oauth2", sentAt: new Date() }),
}

for (const [name, mail] of Object.entries(samples)) {
  fs.writeFileSync(path.join(out, `${name}.html`), mail.html)
  fs.writeFileSync(path.join(out, `${name}.txt`), `Subject: ${mail.subject}\n\n${mail.text}\n`)
}
console.log(`Wrote ${Object.keys(samples).length} previews to ${path.relative(process.cwd(), out)}/ (open the .html files in a browser).`)
