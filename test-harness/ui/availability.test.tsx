// test-harness/ui/availability.test.tsx
import "@/test-harness/ui/module-mocks"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import CoordinatorAvailabilityPage from "@/app/(pages)/(protected)/staff/coordinator/availability/page"
import { mockApi, renderWithClient, routeGet } from "@/test-harness/ui/utils"

const day1 = { id: "d1", date: "2049-01-10", reason: "Family trip", createdAt: "x", conflictsWithAssignment: false }
const day2 = { id: "d2", date: "2049-02-01", reason: null, createdAt: "x", conflictsWithAssignment: true }

describe("Coordinator availability page", () => {
  it("lists marked days with their reason", async () => {
    routeGet({ "/staff/availability": [day1, day2] })
    renderWithClient(<CoordinatorAvailabilityPage />)
    expect(await screen.findByText("Family trip")).toBeInTheDocument()
    expect(screen.getByText(/jan.*10.*2049/i)).toBeInTheDocument()
  })

  it("flags a day that conflicts with an existing assignment", async () => {
    routeGet({ "/staff/availability": [day2] })
    renderWithClient(<CoordinatorAvailabilityPage />)
    expect(await screen.findByText(/already have an assignment/i)).toBeInTheDocument()
  })

  it("no days marked shows a clear empty state", async () => {
    routeGet({ "/staff/availability": [] })
    renderWithClient(<CoordinatorAvailabilityPage />)
    expect(await screen.findByText("No unavailable days marked.")).toBeInTheDocument()
  })

  it("adding a day sends the date and reason, and clears the form", async () => {
    const user = userEvent.setup()
    routeGet({ "/staff/availability": [] })
    mockApi.post.mockResolvedValue({ data: { ...day1, id: "new1" } })
    renderWithClient(<CoordinatorAvailabilityPage />)
    const dateInput = screen.getByLabelText(/^date$/i) as HTMLInputElement
    await user.type(dateInput, "2049-05-01")
    await user.type(screen.getByLabelText(/reason/i), "Wedding of my own")
    await user.click(screen.getByRole("button", { name: /^add$/i }))
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/staff/availability", { date: "2049-05-01", reason: "Wedding of my own" }))
    await waitFor(() => expect((screen.getByLabelText(/reason/i) as HTMLInputElement).value).toBe(""))
  })

  it("the Add button is disabled without a date", async () => {
    routeGet({ "/staff/availability": [] })
    renderWithClient(<CoordinatorAvailabilityPage />)
    await screen.findByText("No unavailable days marked.")
    expect(screen.getByRole("button", { name: /^add$/i })).toBeDisabled()
  })

  it("removing a day calls the delete endpoint with its id", async () => {
    const user = userEvent.setup()
    routeGet({ "/staff/availability": [day1] })
    mockApi.delete.mockResolvedValue({ data: { ok: true } })
    renderWithClient(<CoordinatorAvailabilityPage />)
    await user.click(await screen.findByRole("button", { name: /remove 2049-01-10/i }))
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith("/staff/availability/d1"))
  })

  it("a load failure shows a message, not a blank page", async () => {
    mockApi.get.mockRejectedValue(new Error("x"))
    renderWithClient(<CoordinatorAvailabilityPage />)
    expect(await screen.findByText(/couldn't load your availability/i)).toBeInTheDocument()
  })
})
