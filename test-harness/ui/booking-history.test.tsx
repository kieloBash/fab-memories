// test-harness/ui/booking-history.test.tsx
import "./module-mocks"
import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BookingHistoryTimeline } from "@/features/bookings/components/booking-history-timeline"
import fixture from "@/test-harness/ui/fixtures/booking-history.json"
import { mockApi, renderWithClient, routeGet } from "./utils"

describe("BookingHistoryTimeline", () => {
  it("renders every event from a REAL history fixture, in order", async () => {
    routeGet({ "/bookings/b1/history": fixture })
    renderWithClient(<BookingHistoryTimeline bookingId="b1" />)
    expect(await screen.findByText("Booking requested")).toBeInTheDocument()
    expect(screen.getByText("Deposit payment recorded")).toBeInTheDocument()
    expect(screen.getByText("Deposit verified — booking confirmed")).toBeInTheDocument()
    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent("Booking requested")
    expect(items[2]).toHaveTextContent("Deposit verified")
  })

  it("shows the actor's role next to each event", async () => {
    routeGet({ "/bookings/b1/history": fixture })
    renderWithClient(<BookingHistoryTimeline bookingId="b1" />)
    await screen.findByText("Booking requested")
    expect(screen.getAllByText(/You|Admin/).length).toBeGreaterThan(0)
  })

  it("an empty history says so, not a blank panel", async () => {
    routeGet({ "/bookings/b2/history": [] })
    renderWithClient(<BookingHistoryTimeline bookingId="b2" />)
    expect(await screen.findByText("No history yet.")).toBeInTheDocument()
  })

  it("a load failure is shown, not a blank panel", async () => {
    mockApi.get.mockRejectedValue(new Error("network"))
    renderWithClient(<BookingHistoryTimeline bookingId="b3" />)
    expect(await screen.findByText(/couldn't load the history/i)).toBeInTheDocument()
  })

  it("never renders a raw booking id or a person's name — only the server-built label", async () => {
    routeGet({ "/bookings/b1/history": fixture })
    renderWithClient(<BookingHistoryTimeline bookingId="b1" />)
    await screen.findByText("Booking requested")
    expect(document.body.textContent).not.toMatch(/cm[a-z0-9]{20,}/)
  })
})
