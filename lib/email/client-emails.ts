// lib/email/client-emails.ts
//
// Emails to CLIENTS for booking status changes (FR-12) and verified payments, built from the HTML templates
// in lib/email/templates. Best-effort: sendEmail() never throws, and every attempt is recorded in EmailLog.
//
// Cancellations and flagged payments go through notify() (in-app notice + email) — see lib/notifications/notify.ts.

import { sendEmail } from "@/lib/email/send"
import { bookingStatusEmail, paymentVerifiedEmail } from "@/lib/email/templates"

interface ClientRef { email: string | null; fullName: string | null }
interface BookingRef { id: string; eventType: string; eventDate: Date | string; venue?: string | null; client: ClientRef }

/** Email the client that their booking status changed (FR-12). */
export async function emailBookingStatusChanged(booking: BookingRef, kind: "CONFIRMED" | "RESTORED") {
  if (!booking.client.email) return
  try {
    const mail = bookingStatusEmail({
      kind,
      clientName: booking.client.fullName,
      bookingId: booking.id,
      eventType: booking.eventType,
      eventDate: booking.eventDate,
      venue: booking.venue,
    })
    await sendEmail({ to: booking.client.email, ...mail, kind: `BOOKING_${kind}`, bookingId: booking.id })
  } catch (err) {
    console.error("emailBookingStatusChanged failed:", err)
  }
}

/** Email the client that one of their payments was verified or recorded by staff. */
export async function emailPaymentVerified(
  booking: BookingRef,
  payment: { paymentType: string; amount: number | string | { toString(): string }; method: string },
) {
  if (!booking.client.email) return
  try {
    const mail = paymentVerifiedEmail({
      clientName: booking.client.fullName,
      bookingId: booking.id,
      eventType: booking.eventType,
      eventDate: booking.eventDate,
      paymentType: payment.paymentType,
      amount: Number(payment.amount.toString()),
      method: payment.method,
    })
    await sendEmail({ to: booking.client.email, ...mail, kind: "PAYMENT_VERIFIED", bookingId: booking.id })
  } catch (err) {
    console.error("emailPaymentVerified failed:", err)
  }
}
