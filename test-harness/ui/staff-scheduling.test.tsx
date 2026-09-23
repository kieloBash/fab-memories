// test-harness/ui/staff-scheduling.test.tsx
//
// Happy paths for Module 5 on screen: staffing a booking, the FR-37 banner, a coordinator's own list, the roster.
import "./module-mocks"
import { BookingStaffPanel } from "@/features/staff-assignments/components/booking-staff-panel"
import { CoordinatorRosterTable } from "@/features/staff-assignments/components/coordinator-roster-table"
import { MyAssignmentsList } from "@/features/staff-assignments/components/my-assignments-list"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { mockApi, renderWithClient, routeGet, routerMock, toastMock } from "./utils"

const maria = { id: "c1", fullName: "Maria Santos", username: "coordinator", isActive: true, upcomingCount: 3, nextAssignment: { bookingId: "b7", eventDate: "2027-01-10T00:00:00.000Z", eventType: "DEBUT" } }
const kristine = { id: "c3", fullName: "Kristine Uy", username: "coordinator3", isActive: true, upcomingCount: 0, nextAssignment: null }
const assignment = { id: "a1", bookingId: "b1", coordinatorId: "c1", taskRole: "LEAD_COORDINATOR", taskNote: "Program flow", isBackup: false, notes: "Arrive 7am", coordinator: { id: "c1", fullName: "Maria Santos" } }

function routes(assigned: unknown[] = [assignment], compliance = { guestCount: 120, assignedCount: 1, isCompliant: false, recommendation: { guestCount: 120, min: 7, max: 8, label: "51–150 guests" } }) {
  routeGet({
    "/bookings/b1/staff": (cfg: any) =>
      cfg?.params?.compliance === "true" ? compliance
        : cfg?.params?.conflict === "true" ? { hasConflict: false, conflicts: [] }
        : assigned,
    "/staff": [maria, kristine],
  })
}

describe("BookingStaffPanel", () => {
  it("lists the assigned coordinators with task role, notes and the FR-37 banner", async () => {
    routes()
    renderWithClient(<BookingStaffPanel bookingId="b1" />)
    expect(await screen.findByText("Maria Santos")).toBeInTheDocument()
    expect(screen.getByText(/Lead Coordinator/)).toBeInTheDocument()
    expect(screen.getByText(/Arrive 7am/)).toBeInTheDocument()
    expect(screen.getByText("1 coordinator")).toBeInTheDocument()
    expect(await screen.findByText("Below recommended staffing")).toBeInTheDocument()
    expect(screen.getByText(/recommended 7–8 coordinators/)).toBeInTheDocument()
  })

  it("assign: pick a free coordinator (conflict check shows clear), mark as backup → POST with exactly that", async () => {
    const user = userEvent.setup()
    routes()
    mockApi.post.mockResolvedValue({ data: { id: "a2" } })
    renderWithClient(<BookingStaffPanel bookingId="b1" />)
    await screen.findByText("Maria Santos")
    await user.click(screen.getByRole("button", { name: /assign coordinator/i }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getAllByRole("combobox")[0])
    // Maria is already on this booking, so only Kristine is offered
    expect(screen.queryByRole("option", { name: /Maria Santos/ })).not.toBeInTheDocument()
    await user.click(await screen.findByRole("option", { name: /Kristine Uy/ }))
    expect(await within(dialog).findByText(/no scheduling conflicts on this date/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: /backup coordinator/i }))
    await user.type(within(dialog).getByPlaceholderText(/oversee gift table/i), "Gift table")
    await user.click(within(dialog).getByRole("button", { name: /^assign coordinator$/i }))
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/bookings/b1/staff", {
      coordinatorId: "c3", taskRole: "LEAD_COORDINATOR", taskNote: "Gift table", isBackup: true, notes: undefined,
    }))
    expect(toastMock.success).toHaveBeenCalledWith("Coordinator assigned to event")
  })

  it("remove: the trash button DELETEs that assignment", async () => {
    const user = userEvent.setup()
    routes()
    mockApi.delete.mockResolvedValue({ data: { success: true } })
    renderWithClient(<BookingStaffPanel bookingId="b1" />)
    await user.click(await screen.findByRole("button", { name: "Remove Maria Santos" }))
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith("/bookings/b1/staff/a1"))
  })

  it("a compliant booking shows 'Staffing on track'", async () => {
    routes([assignment], { guestCount: 30, assignedCount: 4, isCompliant: true, recommendation: { guestCount: 30, min: 4, max: 5, label: "Up to 50 guests" } })
    renderWithClient(<BookingStaffPanel bookingId="b1" />)
    expect(await screen.findByText("Staffing on track")).toBeInTheDocument()
  })
})

describe("MyAssignmentsList (coordinator)", () => {
  it("shows my events and opens the coordinator booking page", async () => {
    const user = userEvent.setup()
    routeGet({ "/staff/my-schedule": [{ ...assignment, isBackup: true, booking: { id: "b9", eventType: "WEDDING", status: "CONFIRMED", eventDate: "2027-02-14T00:00:00.000Z", venue: "Taal Vista" } }] })
    renderWithClient(<MyAssignmentsList />)
    expect(await screen.findByText("Wedding")).toBeInTheDocument()
    expect(screen.getByText("Taal Vista")).toBeInTheDocument()
    expect(screen.getByText("Backup")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /wedding/i }))
    expect(routerMock.push).toHaveBeenCalledWith("/staff/coordinator/bookings/b9")
  })

  it("an empty schedule says so", async () => {
    routeGet({ "/staff/my-schedule": [] })
    renderWithClient(<MyAssignmentsList />)
    expect(await screen.findByText("No assignments yet")).toBeInTheDocument()
  })
})

describe("CoordinatorRosterTable (admin)", () => {
  it("lists coordinators with load; clicking one with a next event opens that booking", async () => {
    const user = userEvent.setup()
    routeGet({ "/staff": [maria, kristine] })
    renderWithClient(<CoordinatorRosterTable />)
    expect(await screen.findByText("Maria Santos")).toBeInTheDocument()
    expect(screen.getByText("3 upcoming")).toBeInTheDocument()
    expect(screen.getByText("No upcoming assignments")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /maria santos/i }))
    expect(routerMock.push).toHaveBeenCalledWith("/staff/admin/bookings/b7")
    expect(screen.getByRole("button", { name: /kristine uy/i })).toBeDisabled()
  })
})
