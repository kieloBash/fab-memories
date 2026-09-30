// test-harness/unit/email-templates.unit.test.ts
//
// The HTML email templates (lib/email/templates): right content, working links, plain-text version,
// and — most important — user-typed values are HTML-escaped.
import { describe, expect, it } from "vitest"
import {
  bookingStatusEmail, esc, notificationEmail, paymentFlaggedEmail, paymentVerifiedEmail, testEmail,
} from "@/lib/email/templates"

const booking = { clientName: "Maria Clara Santos", bookingId: "bk_123", eventType: "WEDDING", eventDate: "2027-02-14", venue: "Garden Pavilion" }
const payment = { ...booking, paymentType: "DEPOSIT", amount: 30000, method: "GCASH" }

describe("esc()", () => {
  it("escapes the five HTML-special characters", () => {
    expect(esc(`<b>"Tom" & 'Jerry'</b>`)).toBe("&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;")
  })
  it("turns null/undefined into an empty string", () => {
    expect(esc(null)).toBe("")
    expect(esc(undefined)).toBe("")
  })
})

describe("bookingStatusEmail", () => {
  it("CONFIRMED: subject, first-name greeting, details and a link to the booking", () => {
    const m = bookingStatusEmail({ kind: "CONFIRMED", ...booking })
    expect(m.subject).toBe("Your booking is confirmed — Fab Memories Events")
    expect(m.html).toContain("Hi Maria,")
    expect(m.html).toContain("Garden Pavilion")
    expect(m.html).toContain("/portal/bookings/bk_123")
    expect(m.text).toContain("/portal/bookings/bk_123")
    expect(m.text).not.toMatch(/<[a-z]/i) // plain text has no HTML tags
  })

  it("RESTORED and CANCELLED have their own subjects; CANCELLED shows the reason", () => {
    expect(bookingStatusEmail({ kind: "RESTORED", ...booking }).subject).toMatch(/remains confirmed/i)
    const c = bookingStatusEmail({ kind: "CANCELLED", ...booking, reason: "Venue closed" })
    expect(c.subject).toMatch(/was cancelled/i)
    expect(c.html).toContain("Venue closed")
    expect(c.text).toContain("Reason: Venue closed")
  })

  it("escapes a venue and reason typed by users", () => {
    const m = bookingStatusEmail({ kind: "CANCELLED", ...booking, venue: `<script>alert(1)</script>`, reason: `<img src=x onerror=alert(1)>` })
    expect(m.html).not.toContain("<script>")
    expect(m.html).not.toContain("<img src=x")
    expect(m.html).toContain("&lt;script&gt;")
  })
})

describe("payment emails", () => {
  it("verified: amount in pesos, proper method name, link", () => {
    const m = paymentVerifiedEmail(payment)
    expect(m.subject).toBe("Payment verified — Fab Memories Events")
    expect(m.html).toContain("₱30,000.00")
    expect(m.html).toContain("GCash")
    expect(m.text).toContain("GCash")
    expect(m.html).toContain("/portal/bookings/bk_123")
  })

  it("flagged: includes the staff note, escaped", () => {
    const m = paymentFlaggedEmail({ ...payment, note: `Blurry <screenshot> & wrong amount` })
    expect(m.subject).toMatch(/needs your attention/i)
    expect(m.html).toContain("Blurry &lt;screenshot&gt; &amp; wrong amount")
    expect(m.text).toContain("Blurry <screenshot> & wrong amount")
  })
})

describe("notificationEmail / testEmail", () => {
  it("adds a button only for in-app paths, never for outside URLs", () => {
    expect(notificationEmail({ title: "T", body: "B", link: "/staff/admin/payments" }).html).toContain("/staff/admin/payments")
    expect(notificationEmail({ title: "T", body: "B", link: "https://evil.example" }).html).not.toContain("evil.example")
  })
  it("test email names the transport", () => {
    expect(testEmail({ requestedBy: "Admin", mode: "gmail-oauth2", sentAt: new Date() }).html).toContain("gmail-oauth2")
  })
})
