// test-harness/ui/staffing-calendar-cancelled.test.tsx
import "./module-mocks"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { StaffingCalendar } from "@/features/staff-assignments/components/staffing-calendar"
import { mockApi, renderWithClient } from "./utils"

const today = new Date()
const day = today.getDate()

const entries = [
  { bookingId: "cancelled-1", eventType: "WEDDING", eventDate: today.toISOString(), venue: "x", status: "CANCELLED", guestCount: 80, assignedCount: 0, recommendation: null, isCompliant: null, coordinatorNames: [] },
  { bookingId: "confirmed-1", eventType: "DEBUT", eventDate: today.toISOString(), venue: "x", status: "CONFIRMED", guestCount: 80, assignedCount: 3, recommendation: { min: 3, max: 5 }, isCompliant: true, coordinatorNames: ["A", "B", "C"] },
]

function dayCell() {
  return screen.getByText(String(day), { selector: "span" }).closest("div")!.parentElement as HTMLElement
}

describe("StaffingCalendar — cancelled events", () => {
  it("shows both the cancelled and the confirmed event on the same day, by default", async () => {
    mockApi.get.mockResolvedValue({ data: entries })
    renderWithClient(<StaffingCalendar bookingHref={(id) => `/b/${id}`} />)
    await waitFor(() => expect(screen.getAllByRole("button", { name: /wedding|debut/i }).length).toBe(2))
  })

  it('the cancelled event is struck through and labelled "Cancelled" in its tooltip', async () => {
    mockApi.get.mockResolvedValue({ data: entries })
    renderWithClient(<StaffingCalendar bookingHref={(id) => `/b/${id}`} />)
    const cancelledBtn = await screen.findByRole("button", { name: /wedding/i })
    expect(cancelledBtn.querySelector("span")).toHaveClass("line-through")
    expect(cancelledBtn).toHaveAttribute("title", "Cancelled")
  })

  it('"Hide cancelled" removes it from the grid but keeps the confirmed event', async () => {
    const user = userEvent.setup()
    mockApi.get.mockResolvedValue({ data: entries })
    renderWithClient(<StaffingCalendar bookingHref={(id) => `/b/${id}`} />)
    await screen.findByRole("button", { name: /wedding/i })
    await user.click(screen.getByRole("button", { name: /hide cancelled/i }))
    expect(screen.queryByRole("button", { name: /wedding/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /debut/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /show cancelled/i })).toBeInTheDocument()
  })

  it("shows a count of how many cancelled events are hidden", async () => {
    mockApi.get.mockResolvedValue({ data: entries })
    renderWithClient(<StaffingCalendar bookingHref={(id) => `/b/${id}`} />)
    expect(await screen.findByText(/hide cancelled \(1\)/i)).toBeInTheDocument()
  })

  it("clicking a cancelled event still navigates (it's not inert)", async () => {
    const user = userEvent.setup()
    const { routerMock } = await import("./utils")
    mockApi.get.mockResolvedValue({ data: entries })
    renderWithClient(<StaffingCalendar bookingHref={(id) => `/booking/${id}`} />)
    await user.click(await screen.findByRole("button", { name: /wedding/i }))
    expect(routerMock.push).toHaveBeenCalledWith("/booking/cancelled-1")
  })

  it("the legend explains the cancelled marker", async () => {
    mockApi.get.mockResolvedValue({ data: entries })
    renderWithClient(<StaffingCalendar bookingHref={(id) => `/b/${id}`} />)
    expect(await screen.findByText("Cancelled")).toBeInTheDocument()
  })
})
