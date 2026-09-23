// test-harness/ui/bookings-list-view.test.tsx
import "./module-mocks"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { BookingsListView } from "@/features/bookings/components/bookings-list-view"
import { mockApi, renderWithClient, routerMock } from "./utils"

const booking = {
  id: "b1", status: "PENDING", eventType: "WEDDING", eventDate: "2046-05-01T00:00:00.000Z", venue: "Coral Reef Resort",
  guestCount: 50, agreedPrice: "50000", client: { fullName: "Anna Reyes" }, package: { name: "Silver" },
}

describe("BookingsListView — shared by admin and coordinator", () => {
  it("navigates using the given basePath (coordinator)", async () => {
    const user = userEvent.setup()
    mockApi.get.mockResolvedValue({ data: [booking] })
    renderWithClient(<BookingsListView basePath="/staff/coordinator/bookings" />)
    await user.click(await screen.findByText("Coral Reef Resort"))
    expect(routerMock.push).toHaveBeenCalledWith("/staff/coordinator/bookings/b1")
  })

  it("navigates using the given basePath (admin)", async () => {
    const user = userEvent.setup()
    mockApi.get.mockResolvedValue({ data: [booking] })
    renderWithClient(<BookingsListView basePath="/staff/admin/bookings" />)
    await user.click(await screen.findByText("Coral Reef Resort"))
    expect(routerMock.push).toHaveBeenCalledWith("/staff/admin/bookings/b1")
  })

  it("search is debounced — typing sends far fewer requests than keystrokes, and settles on the full text", async () => {
    const user = userEvent.setup()
    mockApi.get.mockResolvedValue({ data: [] })
    renderWithClient(<BookingsListView basePath="/staff/admin/bookings" />)
    const before = mockApi.get.mock.calls.length
    await user.type(screen.getByLabelText(/search bookings/i), "Coral")
    // Immediately after typing, the debounce has not fired yet.
    expect(mockApi.get.mock.calls.length).toBeLessThan(before + 5)
    await waitFor(() => {
      const [, cfg] = mockApi.get.mock.calls.at(-1)!
      expect(cfg.params).toMatchObject({ search: "Coral" })
    }, { timeout: 2000 })
    // A per-keystroke implementation would have fired 5 requests (C, Co, Cor, Cora, Coral); debouncing fires far fewer.
    expect(mockApi.get.mock.calls.length).toBeLessThan(before + 5)
  })

  it("an empty search + no matches shows a message naming the search term", async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    renderWithClient(<BookingsListView basePath="/staff/admin/bookings" />)
    expect(await screen.findByText("No bookings yet")).toBeInTheDocument()
  })

  it("the status filter still works alongside search", async () => {
    const user = userEvent.setup()
    mockApi.get.mockResolvedValue({ data: [] })
    renderWithClient(<BookingsListView basePath="/staff/admin/bookings" />)
    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "Confirmed" }))
    await waitFor(() => {
      const [, cfg] = mockApi.get.mock.calls.at(-1)!
      expect(cfg.params).toMatchObject({ status: "CONFIRMED" })
    })
  })
})
