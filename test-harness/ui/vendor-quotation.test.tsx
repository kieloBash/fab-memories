// test-harness/ui/vendor-quotation.test.tsx
import "./module-mocks"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { BookingVendorPanel } from "@/features/vendors/components/booking-vendor-panel"
import { mockApi, renderWithClient, routeGet } from "./utils"

const CONTACTED = "2026-09-10T02:00:00.000Z"
const vendor = { id: "v1", name: "Feria Catering", category: "CATERING", contactName: null, contactPhone: "09151111004", contactEmail: null, contactChannel: "SMS", coverageAreas: ["Metro Manila"], notes: null, isActive: true, createdAt: "", updatedAt: "" }
const assignment = (over: any = {}) => ({
  id: "bv1", bookingId: "b1", vendorId: "v1", category: "CATERING",
  notes: "Agreed ₱650/head", contactedAt: CONTACTED, confirmedAt: null,
  quotationAmount: null, quotationNote: null, createdAt: "", updatedAt: "", vendor, ...over,
})
const booking = { id: "b1", vendorCategories: ["CATERING"], isProvincial: false, venue: "Somewhere" } as any

function setup(a = assignment()) {
  routeGet({
    // coverage and the assignment list share one URL; ?coverage=true selects the coverage check
    "/bookings/b1/vendors": (cfg: any) => cfg?.params?.coverage === "true"
      ? { requested: ["CATERING"], covered: [], missing: ["CATERING"], isFullyCovered: false }
      : [a],
    "/vendors": [vendor],
  })
  mockApi.patch.mockResolvedValue({ data: a })
  return renderWithClient(<BookingVendorPanel booking={booking} />)
}
const patchBody = () => mockApi.patch.mock.calls.at(-1)![1]

describe("Vendor panel — quotation (FR-54)", () => {
  it("shows 'Not recorded' and a Record button when there is no quotation", async () => {
    setup()
    expect(await screen.findByText("Not recorded")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /record/i })).toBeInTheDocument()
  })

  it("shows the quotation in pesos with its note", async () => {
    setup(assignment({ quotationAmount: "12500.5", quotationNote: "Buffet for 100 pax" }))
    expect(await screen.findByText("₱12,500.5")).toBeInTheDocument()
    expect(screen.getByText("Buffet for 100 pax")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument()
  })

  it("saves the amount AND resends the existing notes / contacted date (no data loss)", async () => {
    const user = userEvent.setup(); setup()
    await user.click(await screen.findByRole("button", { name: /record/i }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText(/amount/i), "12500.50")
    await user.type(within(dialog).getByLabelText(/note/i), "Buffet, 100 pax")
    await user.click(within(dialog).getByRole("button", { name: /save quotation/i }))
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledTimes(1))
    expect(mockApi.patch.mock.calls[0][0]).toBe("/bookings/b1/vendors/v1")
    expect(patchBody()).toEqual({
      notes: "Agreed ₱650/head", contactedAt: CONTACTED,           // preserved
      quotationAmount: 12500.5, quotationNote: "Buffet, 100 pax",
    })
    expect(patchBody()).not.toHaveProperty("confirmedAt", expect.anything())
  })

  it("rejects negative amounts and more than 2 decimals; Save is disabled", async () => {
    const user = userEvent.setup(); setup()
    await user.click(await screen.findByRole("button", { name: /record/i }))
    const dialog = await screen.findByRole("dialog")
    const amount = within(dialog).getByLabelText(/amount/i)
    const save = within(dialog).getByRole("button", { name: /save quotation/i })
    await user.type(amount, "-5")
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/valid amount/i)
    expect(save).toBeDisabled()
    await user.clear(amount); await user.type(amount, "10.123")
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/2 decimal/i)
    expect(save).toBeDisabled()
    await user.clear(amount); await user.type(amount, "10.12")
    await waitFor(() => expect(save).toBeEnabled())
    expect(mockApi.patch).not.toHaveBeenCalled()
  })

  it.each(["10.12", "1.15", "0.07", "19.99", "4.35", "12500.5", "0"])("accepts the valid amount %s (float-safe validation)", async (typed) => {
    const user = userEvent.setup(); setup()
    await user.click(await screen.findByRole("button", { name: /record/i }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText(/amount/i), typed)
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: /save quotation/i })).toBeEnabled()
  })

  it("an empty amount clears the quotation (sends null)", async () => {
    const user = userEvent.setup(); setup(assignment({ quotationAmount: "9000", quotationNote: "old" }))
    await user.click(await screen.findByRole("button", { name: /edit/i }))
    const dialog = await screen.findByRole("dialog")
    await user.clear(within(dialog).getByLabelText(/amount/i))
    await user.clear(within(dialog).getByLabelText(/note/i))
    await user.click(within(dialog).getByRole("button", { name: /save quotation/i }))
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalled())
    expect(patchBody()).toMatchObject({ quotationAmount: null, quotationNote: null, notes: "Agreed ₱650/head" })
  })
})

describe("Vendor panel — regression: status toggles no longer erase other fields", () => {
  it("'Mark confirmed' keeps the contacted date and the note", async () => {
    const user = userEvent.setup(); setup()
    await user.click(await screen.findByRole("button", { name: /mark confirmed/i }))
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalled())
    expect(patchBody()).toMatchObject({ notes: "Agreed ₱650/head", contactedAt: CONTACTED })
    expect(typeof patchBody().confirmedAt).toBe("string")
  })

  it("un-marking contacted keeps the note and any confirmation", async () => {
    const user = userEvent.setup(); const CONF = "2026-09-11T02:00:00.000Z"
    setup(assignment({ confirmedAt: CONF }))
    await user.click(await screen.findByRole("button", { name: /contacted/i }))
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalled())
    expect(patchBody()).toMatchObject({ notes: "Agreed ₱650/head", confirmedAt: CONF })
    expect(patchBody().contactedAt).toBeUndefined()                // the one thing being cleared
  })
})
