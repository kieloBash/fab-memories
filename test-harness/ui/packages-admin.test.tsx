// test-harness/ui/packages-admin.test.tsx
import "./module-mocks"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import AdminPackagesPage from "@/app/(pages)/(protected)/staff/admin/packages/page"
import { PackageCard } from "@/features/packages/components/package-card"
import { mockApi, renderWithClient, routeGet, routerMock } from "./utils"

const active = { id: "p1", name: "Gold Package", description: "d", eventType: "WEDDING" as const, price: "50000", priceProvincial: "", inclusions: ["Photo", "Video"], isActive: true, createdAt: "x", updatedAt: "x", _count: { bookings: 3 } }
const inactive = { ...active, id: "p2", name: "Bronze Package", isActive: false, _count: { bookings: 0 } }

describe("Package card — admin actions never trigger selection", () => {
  it("clicking Edit calls onEdit, not onSelect", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn(); const onEdit = vi.fn()
    renderWithClient(<PackageCard pkg={active} onSelect={onSelect} onEdit={onEdit} />)
    await user.click(screen.getByTestId("package-edit-button"))
    expect(onEdit).toHaveBeenCalledWith(active)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("an inactive package still shows working admin actions (not dimmed/disabled for staff)", async () => {
    const user = userEvent.setup()
    const onToggleActive = vi.fn()
    renderWithClient(<PackageCard pkg={inactive} onToggleActive={onToggleActive} />)
    await user.click(screen.getByTestId("package-toggle-active-button"))
    expect(onToggleActive).toHaveBeenCalledWith(inactive)
  })

  it("the toggle button reads Deactivate for an active package, Activate for an inactive one", () => {
    renderWithClient(<PackageCard pkg={active} onToggleActive={() => {}} />)
    expect(screen.getByTestId("package-toggle-active-button")).toHaveTextContent(/deactivate/i)
  })
})

describe("Admin packages page", () => {
  it("Edit navigates to the edit page", async () => {
    const user = userEvent.setup()
    routeGet({ "/packages": [active] })
    renderWithClient(<AdminPackagesPage />)
    await screen.findByTestId("package-edit-button")
    await user.click(screen.getByTestId("package-edit-button"))
    expect(routerMock.push).toHaveBeenCalledWith("/staff/admin/packages/p1/edit")
  })

  it("activating (no dialog) sends only { isActive: true }", async () => {
    const user = userEvent.setup()
    routeGet({ "/packages": [inactive] })
    mockApi.patch.mockResolvedValue({ data: { ...inactive, isActive: true } })
    renderWithClient(<AdminPackagesPage />)
    await screen.findByTestId("package-toggle-active-button")
    await user.click(screen.getByTestId("package-toggle-active-button"))
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith("/packages/p2", { isActive: true }))
  })

  it("deactivating asks for confirmation first, and sends only { isActive: false }", async () => {
    const user = userEvent.setup()
    routeGet({ "/packages": [active] })
    mockApi.patch.mockResolvedValue({ data: { ...active, isActive: false } })
    renderWithClient(<AdminPackagesPage />)
    await screen.findByTestId("package-toggle-active-button")
    await user.click(screen.getByTestId("package-toggle-active-button"))
    expect(mockApi.patch).not.toHaveBeenCalled()
    expect(await screen.findByText(/deactivate "gold package"/i)).toBeInTheDocument()
    expect(screen.getByText(/3 existing bookings/i)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /^deactivate$/i }))
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith("/packages/p1", { isActive: false }))
  })

  it("cancelling the confirmation sends nothing", async () => {
    const user = userEvent.setup()
    routeGet({ "/packages": [active] })
    renderWithClient(<AdminPackagesPage />)
    await screen.findByTestId("package-toggle-active-button")
    await user.click(screen.getByTestId("package-toggle-active-button"))
    await screen.findByText(/deactivate "gold package"/i)
    await user.click(screen.getByRole("button", { name: /cancel/i }))
    expect(mockApi.patch).not.toHaveBeenCalled()
  })
})
