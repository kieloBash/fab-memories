// test-harness/ui/display-and-landing.test.tsx
//
// Display components render real-shaped data correctly, and every landing-page section renders without errors.
// (Smoke level on purpose: layout and looks are checked by hand — see tests/INTEGRATION_AND_MANUAL_TEST_GUIDE.md.)
import "./module-mocks"
import { BookingCard } from "@/features/bookings/components/booking-card"
import { InstallmentScheduleTable } from "@/features/installments/components/installment-schedule-table"
import CtaSection from "@/features/landing/components/CtaSection"
import FeaturesSection from "@/features/landing/components/FeaturesSection"
import Footer from "@/features/landing/components/Footer"
import HeroSection from "@/features/landing/components/HeroSection"
import Navbar from "@/features/landing/components/Navbar"
import RolesSection from "@/features/landing/components/RolesSection"
import StatsSection from "@/features/landing/components/StatsSection"
import { PaymentSummaryCard } from "@/features/payments/components/payment-summary-card"
import { NeedsAttentionList } from "@/features/reports/components/needs-attention-list"
import { RecentAuditFeed } from "@/features/reports/components/recent-audit-feed"
import dashboard from "@/test-harness/ui/fixtures/dashboard.json"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { renderWithClient, routeGet } from "./utils"

describe("BookingCard", () => {
  it("shows the event, venue, guests, status and price; clicking opens it", async () => {
    const user = userEvent.setup(); const onClick = vi.fn()
    const booking = {
      id: "b1", eventType: "WEDDING", eventDate: "2027-02-14T00:00:00.000Z", venue: "Taal Vista, Tagaytay", guestCount: 150,
      status: "CONFIRMED", agreedPrice: "120000", isProvincial: true, package: { name: "Classic Wedding", price: "100000" },
    } as any
    render(<BookingCard booking={booking} onClick={onClick} />)
    expect(screen.getByText(/Taal Vista, Tagaytay/)).toBeInTheDocument()
    expect(screen.getByText(/150/)).toBeInTheDocument()
    expect(document.body.textContent).toMatch(/120,000/)
    await user.click(screen.getByText(/Taal Vista, Tagaytay/))
    expect(onClick).toHaveBeenCalled()
  })
})

describe("PaymentSummaryCard", () => {
  it("shows client, amount, method, reference and status", () => {
    const payment = {
      id: "p1", amount: "25000", method: "GCASH", referenceNumber: "GC-001", status: "SUBMITTED", submittedAt: "2026-09-20T02:00:00.000Z",
      verificationNote: null, paymentType: "DEPOSIT", booking: { client: { fullName: "Anna Reyes" } },
    } as any
    render(<PaymentSummaryCard payment={payment} />)
    expect(screen.getByText("Anna Reyes")).toBeInTheDocument()
    expect(document.body.textContent).toMatch(/25,000/)
    expect(document.body.textContent).toMatch(/GCash/)
    expect(document.body.textContent).toMatch(/GC-001/)
  })
})

describe("InstallmentScheduleTable (client portal)", () => {
  it("shows each installment; 'Pay now' only on an unpaid one without a pending submission", async () => {
    const user = userEvent.setup(); const onPay = vi.fn()
    routeGet({ "/bookings/b1/installments": [
      { id: "i1", order: 1, dueDate: "2027-01-10", amount: "45000", status: "PAID", payments: [{ status: "VERIFIED" }] },
      { id: "i2", order: 2, dueDate: "2027-02-10", amount: "45000", status: "UNPAID", payments: [] },
      { id: "i3", order: 3, dueDate: "2027-03-10", amount: "30000", status: "UNPAID", payments: [{ status: "SUBMITTED" }] },
    ] })
    renderWithClient(<InstallmentScheduleTable bookingId="b1" packagePrice={150000} depositPaid={30000} onPayInstallment={onPay} />)
    const payButtons = await screen.findAllByRole("button", { name: /pay now/i })
    expect(payButtons).toHaveLength(1)
    await user.click(payButtons[0])
    expect(onPay).toHaveBeenCalledWith("i2", 45000)
  })
})

describe("Dashboard panels (real fixture)", () => {
  it("NeedsAttentionList renders every item from the dashboard payload", () => {
    render(<NeedsAttentionList items={dashboard.needsAttention as any} />)
    expect(screen.getAllByText("Ben Torres").length).toBeGreaterThan(0)
    expect(screen.getByText(/cancellation requested/i)).toBeInTheDocument()
  })
  it("RecentAuditFeed renders the latest audit descriptions", () => {
    render(<RecentAuditFeed items={dashboard.recentAudit as any} isLoading={false} />)
    expect(screen.getAllByText(/Booking request rejected/).length).toBeGreaterThan(0)
  })
})

describe("Landing page sections render", () => {
  it.each([
    ["Navbar", Navbar], ["HeroSection", HeroSection], ["FeaturesSection", FeaturesSection], ["RolesSection", RolesSection],
    ["StatsSection", StatsSection], ["CtaSection", CtaSection], ["Footer", Footer],
  ])("%s", (_name, Section) => {
    const { container } = render(<Section />)
    expect(container.textContent!.trim().length).toBeGreaterThan(10)
  })

  it("the public links point at sign-in / sign-up / packages", () => {
    render(<><Navbar /><HeroSection /><CtaSection /></>)
    const hrefs = [...document.querySelectorAll("a")].map((a) => a.getAttribute("href"))
    expect(hrefs.some((h) => h?.startsWith("/sign-in") || h?.startsWith("/sign-up"))).toBe(true)
  })
})
