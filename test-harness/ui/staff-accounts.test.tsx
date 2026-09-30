// test-harness/ui/staff-accounts.test.tsx
import "./module-mocks"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { CreateStaffDialog } from "@/features/staff-accounts/components/create-staff-dialog"
import { StaffAccountsTable } from "@/features/staff-accounts/components/staff-accounts-table"
import { mockApi, renderWithClient, routeGet } from "./utils"

const admin = { id: "u1", username: "admin", fullName: "Site Admin", role: "ADMIN", isActive: true, createdAt: "x", updatedAt: "x" }
const coord = { id: "u2", username: "jsantos", fullName: "Juana Santos", role: "COORDINATOR", isActive: true, createdAt: "x", updatedAt: "x" }
const deactivated = { id: "u3", username: "rlim", fullName: "Rico Lim", role: "VENDOR", isActive: false, createdAt: "x", updatedAt: "x" }

describe("StaffAccountsTable", () => {
  it("renders every account with role and status", async () => {
    routeGet({ "/staff-accounts": [admin, coord, deactivated] })
    renderWithClient(<StaffAccountsTable currentUsername="admin" />)
    expect(await screen.findByText("Site Admin")).toBeInTheDocument()
    expect(screen.getByText("Juana Santos")).toBeInTheDocument()
    expect(screen.getAllByText("Active")).toHaveLength(2)
    expect(screen.getByText("Deactivated")).toBeInTheDocument()
  })

  it("marks the signed-in user's own row", async () => {
    routeGet({ "/staff-accounts": [admin, coord] })
    renderWithClient(<StaffAccountsTable currentUsername="admin" />)
    const row = (await screen.findByText("Site Admin")).closest("tr")!
    expect(row).toHaveTextContent("(you)")
    const otherRow = screen.getByText("Juana Santos").closest("tr")!
    expect(otherRow).not.toHaveTextContent("(you)")
  })

  it("disables Deactivate for the signed-in user's own row", async () => {
    routeGet({ "/staff-accounts": [admin] })
    renderWithClient(<StaffAccountsTable currentUsername="admin" />)
    expect(await screen.findByTestId("staff-deactivate-button")).toBeDisabled()
  })

  it("a deactivated account shows Reactivate, not Deactivate", async () => {
    routeGet({ "/staff-accounts": [deactivated] })
    renderWithClient(<StaffAccountsTable currentUsername="admin" />)
    expect(await screen.findByTestId("staff-reactivate-button")).toBeInTheDocument()
    expect(screen.queryByTestId("staff-deactivate-button")).not.toBeInTheDocument()
  })

  it("clicking Reactivate sends only { isActive: true }", async () => {
    const user = userEvent.setup()
    routeGet({ "/staff-accounts": [deactivated] })
    mockApi.patch.mockResolvedValue({ data: { ...deactivated, isActive: true } })
    renderWithClient(<StaffAccountsTable currentUsername="admin" />)
    await user.click(await screen.findByTestId("staff-reactivate-button"))
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith("/staff-accounts/u3", { isActive: true }))
  })

  it("Deactivate asks for confirmation first", async () => {
    const user = userEvent.setup()
    routeGet({ "/staff-accounts": [coord] })
    renderWithClient(<StaffAccountsTable currentUsername="admin" />)
    await user.click(await screen.findByTestId("staff-deactivate-button"))
    expect(mockApi.delete).not.toHaveBeenCalled()
    expect(await screen.findByText(/deactivate juana santos's account/i)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /^deactivate$/i }))
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith("/staff-accounts/u2"))
  })

  it("Edit → change the role → sends only the changed field", async () => {
    const user = userEvent.setup()
    routeGet({ "/staff-accounts": [coord] })
    mockApi.patch.mockResolvedValue({ data: { ...coord, role: "ADMIN" } })
    renderWithClient(<StaffAccountsTable currentUsername="admin" />)
    await user.click(await screen.findByTestId("staff-edit-button"))
    await user.click(screen.getByRole("combobox"))
    // VENDOR is no longer offered (no vendor accounts in this version) — only Admin and Coordinator.
    expect(screen.queryByRole("option", { name: /vendor/i })).not.toBeInTheDocument()
    await user.click(await screen.findByRole("option", { name: "Admin" }))
    await user.click(screen.getByRole("button", { name: /save changes/i }))
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith("/staff-accounts/u2", { role: "ADMIN" }))
  })

  it("the role selector is disabled when editing your OWN account", async () => {
    const user = userEvent.setup()
    routeGet({ "/staff-accounts": [admin] })
    renderWithClient(<StaffAccountsTable currentUsername="admin" />)
    await user.click(await screen.findByTestId("staff-edit-button"))
    expect(await screen.findByText(/cannot change your own role/i)).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toBeDisabled()
  })

  it("a load failure shows a message, not a blank table", async () => {
    mockApi.get.mockRejectedValue(new Error("x"))
    renderWithClient(<StaffAccountsTable currentUsername="admin" />)
    expect(await screen.findByText(/couldn't load staff accounts/i)).toBeInTheDocument()
  })
})

describe("CreateStaffDialog", () => {
  it("submits the form and closes on success", async () => {
    const user = userEvent.setup()
    mockApi.post.mockResolvedValue({ data: { ...coord, id: "new1" } })
    renderWithClient(<CreateStaffDialog />)
    await user.click(screen.getByRole("button", { name: /new account/i }))
    await user.type(screen.getByLabelText(/full name/i), "New Person")
    await user.type(screen.getByLabelText(/^username/i), "newperson")
    await user.type(screen.getByLabelText(/temporary password/i), "longenough1")
    await user.click(screen.getByRole("button", { name: /^create account$/i }))
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/staff-accounts", { username: "newperson", password: "longenough1", fullName: "New Person", role: "COORDINATOR" }))
    await waitFor(() => expect(screen.queryByLabelText(/^username/i)).not.toBeInTheDocument())
  })

  it("the create button stays disabled until the form is valid", async () => {
    const user = userEvent.setup()
    renderWithClient(<CreateStaffDialog />)
    await user.click(screen.getByRole("button", { name: /new account/i }))
    expect(screen.getByRole("button", { name: /^create account$/i })).toBeDisabled()
    await user.type(screen.getByLabelText(/full name/i), "A")
    await user.type(screen.getByLabelText(/^username/i), "ab")
    await user.type(screen.getByLabelText(/temporary password/i), "short")
    expect(screen.getByRole("button", { name: /^create account$/i })).toBeDisabled()
  })
})
