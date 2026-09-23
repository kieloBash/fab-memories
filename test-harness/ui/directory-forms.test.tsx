// test-harness/ui/directory-forms.test.tsx
//
// Happy paths for the admin catalogue forms: service packages and vendors. These forms don't call the API
// themselves — they hand a clean payload to onSubmit — so that payload is what is asserted.
import "./module-mocks"
import { PackageForm } from "@/features/packages/components/package-form"
import { VendorForm } from "@/features/vendors/components/vendor-form"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

describe("PackageForm", () => {
  it("new package: name, type, price, description and inclusions (blank ones dropped)", async () => {
    const user = userEvent.setup(); const onSubmit = vi.fn()
    render(<PackageForm onSubmit={onSubmit} isPending={false} submitLabel="Create package" pendingLabel="Creating…" />)
    const submit = screen.getByRole("button", { name: "Create package" })
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText("Package Name"), "  Grand Debut  ")
    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "Debut" }))
    await user.type(screen.getByLabelText("Price (PHP)"), "75000.50")
    await user.type(screen.getByLabelText(/description/i), "18 roses, 18 candles")
    await user.type(screen.getByLabelText("Inclusion 1"), "Coordination")
    await user.click(screen.getByRole("button", { name: /add inclusion/i }))
    await user.click(screen.getByRole("button", { name: /add inclusion/i }))
    await user.type(screen.getByLabelText("Inclusion 3"), "Styling")
    await user.click(submit)
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Grand Debut", description: "18 roses, 18 candles", eventType: "DEBUT", price: 75000.5, inclusions: ["Coordination", "Styling"], isActive: true,
    })
  })

  it("edit: starts from the package's values and keeps its active flag", async () => {
    const user = userEvent.setup(); const onSubmit = vi.fn()
    const initial = { id: "p1", name: "Classic", description: null, eventType: "WEDDING", price: "85000", inclusions: ["A"], isActive: false } as any
    render(<PackageForm initial={initial} onSubmit={onSubmit} isPending={false} submitLabel="Save" pendingLabel="Saving…" />)
    expect(screen.getByLabelText("Package Name")).toHaveValue("Classic")
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Classic", eventType: "WEDDING", price: 85000, inclusions: ["A"], isActive: false }))
  })
})

describe("VendorForm", () => {
  it("new vendor with category, contact, coverage areas (preset + custom) and notes", async () => {
    const user = userEvent.setup(); const onSubmit = vi.fn()
    render(<VendorForm onSubmit={onSubmit} isPending={false} />)
    await user.type(screen.getByLabelText(/vendor \/ business name/i), "Bloom & Petal")
    const [category, channel] = screen.getAllByRole("combobox")
    await user.click(category)
    await user.click(await screen.findByRole("option", { name: /Florals/ }))
    await user.type(screen.getByLabelText(/contact person/i), "Liza")
    await user.type(screen.getByLabelText(/phone \/ viber/i), "09171112222")
    await user.type(screen.getByLabelText(/^email$/i), "liza@bloom.ph")
    await user.click(channel)
    await user.click(await screen.findByRole("option", { name: "Viber" }))
    await user.click(screen.getByRole("button", { name: "Cavite" }))
    await user.type(screen.getByPlaceholderText(/add other area/i), "Iloilo{Enter}")
    await user.type(screen.getByLabelText(/admin notes/i), "₱15k per event")
    await user.click(screen.getByRole("button", { name: /save vendor/i }))
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Bloom & Petal", category: "FLORALS", contactName: "Liza", contactPhone: "09171112222", contactEmail: "liza@bloom.ph",
      contactChannel: "Viber", coverageAreas: ["Cavite", "Iloilo"], notes: "₱15k per event",
    })
  })

  it("optional fields left blank are sent as undefined, not empty strings", async () => {
    const user = userEvent.setup(); const onSubmit = vi.fn()
    render(<VendorForm onSubmit={onSubmit} isPending={false} submitLabel="Add" />)
    await user.type(screen.getByLabelText(/vendor \/ business name/i), "Feast Co")
    await user.click(screen.getByRole("button", { name: "Add" }))
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Feast Co", category: "CATERING", contactName: undefined, contactPhone: undefined, contactEmail: undefined,
      contactChannel: undefined, coverageAreas: [], notes: undefined,
    })
  })
})
