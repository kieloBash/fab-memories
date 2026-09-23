// test-harness/ui/small-components.test.tsx
//
// Happy paths for the small building blocks used inside bigger screens.
import "./module-mocks"
import { PackageSelector } from "@/features/packages/components/package-selector"
import { CopyVendorBriefButton } from "@/features/vendors/components/copy-vendor-brief-button"
import { VendorCategoryPicker } from "@/features/vendors/components/vendor-category-picker"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { mockApi, renderWithClient, routeGet, toastMock } from "./utils"

describe("CopyVendorBriefButton", () => {
  it("copies the vendor-specific public brief URL and confirms with a toast", async () => {
    const user = userEvent.setup() // installs a clipboard stub on navigator
    render(<CopyVendorBriefButton bookingId="b1" bookingVendorId="bv9" vendorName="Feast Co" />)
    await user.click(screen.getByRole("button", { name: "Copy event brief link for Feast Co" }))
    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/vendor-brief/b1?view=bv9`)
    expect(toastMock.success).toHaveBeenCalledWith("Brief link copied for Feast Co", expect.any(Object))
  })
})

describe("VendorCategoryPicker", () => {
  function Harness({ spy }: { spy: (v: string[]) => void }) {
    const [value, setValue] = useState<any[]>([])
    return <VendorCategoryPicker value={value} onChange={(v) => { setValue(v); spy(v) }} />
  }

  it("toggles categories on and off (aria-pressed follows)", async () => {
    const user = userEvent.setup(); const spy = vi.fn()
    render(<Harness spy={spy} />)
    const catering = screen.getByRole("button", { name: /Catering/ })
    await user.click(catering)
    await user.click(screen.getByRole("button", { name: /Photography/ }))
    expect(catering).toHaveAttribute("aria-pressed", "true")
    expect(spy).toHaveBeenLastCalledWith(["CATERING", "PHOTOGRAPHY"])
    await user.click(catering)
    expect(spy).toHaveBeenLastCalledWith(["PHOTOGRAPHY"])
  })

  it("disabled = read-only review", () => {
    render(<VendorCategoryPicker value={["FLORALS"]} onChange={vi.fn()} disabled />)
    expect(screen.getByRole("button", { name: /Florals/ })).toBeDisabled()
  })
})

describe("PackageSelector (client booking form)", () => {
  const pkgs = [
    { id: "p1", name: "Classic Wedding", description: null, eventType: "WEDDING", price: "85000", priceProvincial: "97750", inclusions: ["Coordination"], isActive: true, _count: { bookings: 0 } },
    { id: "p2", name: "Elegant Debut", description: null, eventType: "DEBUT", price: "65000", priceProvincial: null, inclusions: ["Styling"], isActive: true, _count: { bookings: 0 } },
  ]

  it("asks only for ACTIVE packages, shows those for the chosen event type, and selecting one reports it", async () => {
    const user = userEvent.setup(); const onSelect = vi.fn()
    routeGet({ "/packages": pkgs })
    renderWithClient(<PackageSelector eventType="WEDDING" onSelect={onSelect} />)
    expect(await screen.findByText("Classic Wedding")).toBeInTheDocument()
    expect(screen.queryByText("Elegant Debut")).not.toBeInTheDocument()
    expect(mockApi.get).toHaveBeenCalledWith("/packages", { params: { active: "true" } })
    await user.click(screen.getByText("Classic Wedding"))
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "p1" })))
  })
})
