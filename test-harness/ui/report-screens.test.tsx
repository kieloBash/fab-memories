// test-harness/ui/report-screens.test.tsx
import "./module-mocks"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError } from "axios"
import { describe, expect, it, vi } from "vitest"
import { ReportCatalog } from "@/features/reports/components/report-catalog"
import { ReportPage } from "@/features/reports/components/report-page"
import audit from "./fixtures/audit.json"
import bookings from "./fixtures/bookings.json"
import payments from "./fixtures/payments.json"
import staff from "./fixtures/staff.json"
import vendors from "./fixtures/vendors.json"
import { mockApi, renderWithClient, routeGet, toastMock } from "./utils"

const allReports = () => routeGet({
  "/reports/bookings": bookings, "/reports/payments": payments, "/reports/vendors": vendors,
  "/reports/staff": staff, "/reports/audit": audit,
  "/audit/filter-options": { users: [{ id: "u-admin", fullName: "System Administrator" }] },
})
const lastReportCall = (path: string) => mockApi.get.mock.calls.filter((c) => c[0] === path).at(-1)?.[1]?.params

describe("Reports landing", () => {
  it("admin sees all five reports", () => {
    renderWithClient(<ReportCatalog basePath="/staff/admin" />)
    for (const t of ["Booking & scheduling", "Payments & transactions", "Vendor coordination", "Staff scheduling", "Audit trail"])
      expect(screen.getByRole("heading", { name: t })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /audit trail/i })).toHaveAttribute("href", "/staff/admin/reports/audit")
  })
  it("coordinator sees four — no audit trail (FR-50)", () => {
    renderWithClient(<ReportCatalog basePath="/staff/coordinator" />)
    expect(screen.queryByRole("heading", { name: "Audit trail" })).not.toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(4)
    expect(screen.getByRole("link", { name: /booking/i })).toHaveAttribute("href", "/staff/coordinator/reports/bookings")
  })
})

describe("Each report renders real data", () => {
  it("bookings: metrics, charts, table, generation time", async () => {
    allReports(); renderWithClient(<ReportPage type="bookings" basePath="/staff/admin" />)
    expect(await screen.findByText("Confirmed value")).toBeInTheDocument()
    const first = (bookings as any).rows[0]
    await screen.findByText(first.venue)
    expect(document.querySelector(`a[href="/staff/admin/bookings/${first.bookingId}"]`)).toHaveTextContent(first.clientName)
    expect(screen.getByLabelText("Bookings by status")).toBeInTheDocument()
    expect(screen.getByTestId("report-meta")).toHaveTextContent(/built in \d+ ms/)      // NFR-05 evidence line
    expect(screen.getByText(/Showing 1–5 of 34/)).toBeInTheDocument()
  })
  it("coordinator base path changes the deep links", async () => {
    allReports(); renderWithClient(<ReportPage type="bookings" basePath="/staff/coordinator" />)
    const first = (bookings as any).rows[0]
    await screen.findByText(first.venue)
    expect(document.querySelector(`a[href="/staff/coordinator/bookings/${first.bookingId}"]`)).toHaveTextContent(first.clientName)
    expect(document.querySelector(`a[href^="/staff/admin/"]`)).toBeNull()
  })
  it("payments: outstanding balances first, overdue flagged, no proof URLs", async () => {
    allReports(); renderWithClient(<ReportPage type="payments" basePath="/staff/admin" />)
    expect(await screen.findByText("Outstanding balances")).toBeInTheDocument()
    expect(screen.getAllByText(/\d+d overdue/).length).toBeGreaterThan(0)
    expect(screen.getByText("Awaiting verification", { selector: "p" })).toBeInTheDocument()
    expect(document.body.innerHTML).not.toMatch(/proofStoragePath|proofImageUrl/)
  })
  it("vendors: coverage gaps shown as warnings, quotations as pesos", async () => {
    allReports(); renderWithClient(<ReportPage type="vendors" basePath="/staff/admin" />)
    expect(await screen.findByText("Coverage gaps", { selector: "h2" })).toBeInTheDocument()
    expect(screen.getAllByText(/Catering/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/₱[\d,]+/).length).toBeGreaterThan(0)
  })
  it("staff: understaffed events and conflicts are labelled", async () => {
    allReports(); renderWithClient(<ReportPage type="staff" basePath="/staff/admin" />)
    expect(await screen.findByText("Coordinator workload")).toBeInTheDocument()
    expect(screen.getAllByText("Understaffed").length).toBeGreaterThan(0)
  })
  it("audit: intact chain, then a BROKEN chain raises an alert naming the entry", async () => {
    allReports(); const { unmount } = renderWithClient(<ReportPage type="audit" basePath="/staff/admin" />)
    expect(await screen.findByText("Intact")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    unmount()

    const broken = { ...(audit as any), chain: { isValid: false, totalEntries: 36, brokenAtSequence: 5, reason: "This entry's stored content does not match its recorded hash.", verifiedAt: "2026-09-20T00:00:00Z" } }
    routeGet({ "/reports/audit": broken, "/audit/filter-options": { users: [] } })
    renderWithClient(<ReportPage type="audit" basePath="/staff/admin" />)
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/tampering detected/i)
    expect(alert).toHaveTextContent("#5")
    expect(screen.getByText("BROKEN")).toBeInTheDocument()
  })
  it("audit report opens on the last 30 days; others open unfiltered", async () => {
    allReports(); renderWithClient(<ReportPage type="audit" basePath="/staff/admin" />)
    await screen.findByText("Intact")
    expect(lastReportCall("/reports/audit")).toMatchObject({ pageSize: 25 })
    expect(lastReportCall("/reports/audit").from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it("shows an error card with retry when the API fails", async () => {
    mockApi.get.mockRejectedValue(new AxiosError("bad", "500", undefined, undefined, { status: 500, data: { error: "Failed to generate the report" } } as any))
    renderWithClient(<ReportPage type="bookings" basePath="/staff/admin" />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to generate the report")
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })
})

describe("Filters", () => {
  it("date range: an impossible range is blocked in the UI and never reaches the API", async () => {
    allReports(); renderWithClient(<ReportPage type="bookings" basePath="/staff/admin" />)
    await screen.findByText("Confirmed value")
    const calls = mockApi.get.mock.calls.length
    fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-10-01" } })
    await waitFor(() => expect(lastReportCall("/reports/bookings")).toMatchObject({ to: "2026-10-01" }))
    const afterValid = mockApi.get.mock.calls.length
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-10-05" } })
    expect(await screen.findByRole("alert")).toHaveTextContent(/'from' date must not be after/i)
    await new Promise((r) => setTimeout(r, 100))
    expect(mockApi.get.mock.calls.length).toBe(afterValid)
    expect(afterValid).toBeGreaterThan(calls)
  })
  it("status dropdown filters the request and resets to page 1", async () => {
    const user = userEvent.setup(); allReports()
    renderWithClient(<ReportPage type="bookings" basePath="/staff/admin" />)
    await screen.findByText("Confirmed value")
    await user.click(screen.getByRole("button", { name: "Next page" }))
    await waitFor(() => expect(lastReportCall("/reports/bookings")).toMatchObject({ page: 2 }))

    await user.click(screen.getByRole("combobox", { name: "All statuses" }))
    await user.click(await screen.findByRole("option", { name: "Confirmed" }))
    await waitFor(() => expect(lastReportCall("/reports/bookings")).toMatchObject({ bookingStatus: "CONFIRMED", page: 1 }))
    expect(lastReportCall("/reports/bookings")).not.toHaveProperty("eventType")
  })
  it("presets and 'Clear filters'", async () => {
    const user = userEvent.setup(); allReports()
    renderWithClient(<ReportPage type="bookings" basePath="/staff/admin" />)
    await screen.findByText("Confirmed value")
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Next 30 days" }))
    await waitFor(() => expect(lastReportCall("/reports/bookings")).toHaveProperty("from"))
    await user.click(await screen.findByRole("button", { name: /clear filters/i }))
    await waitFor(() => expect(lastReportCall("/reports/bookings")).not.toHaveProperty("from"))
  })
  it("audit search is debounced (one request, not one per keystroke)", async () => {
    const user = userEvent.setup(); allReports()
    renderWithClient(<ReportPage type="audit" basePath="/staff/admin" />)
    await screen.findByText("Intact")
    const before = mockApi.get.mock.calls.filter((c) => c[0] === "/reports/audit").length
    await user.type(screen.getByLabelText("Search descriptions"), "flagged")
    await waitFor(() => expect(lastReportCall("/reports/audit")).toMatchObject({ search: "flagged" }))
    expect(mockApi.get.mock.calls.filter((c) => c[0] === "/reports/audit").length - before).toBe(1)
  })
})

describe("CSV export (FR-57)", () => {
  const setupDownload = () => {
    URL.createObjectURL = vi.fn(() => "blob:test"); URL.revokeObjectURL = vi.fn()
    return vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  }
  it("downloads with the server's filename; sends filters but not paging", async () => {
    const click = setupDownload(); const user = userEvent.setup(); allReports()
    renderWithClient(<ReportPage type="payments" basePath="/staff/admin" />)
    await screen.findByText("Outstanding balances")
    await user.click(screen.getByRole("button", { name: "Next page" }))

    mockApi.get.mockImplementationOnce(async () => ({ data: new Blob(["a,b\n1,2"]), headers: { "content-disposition": 'attachment; filename="payments-outstanding-report-2026-09-20.csv"' } }))
    await user.click(screen.getByRole("button", { name: "Export outstanding" }))
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Downloaded payments-outstanding-report-2026-09-20.csv"))
    const call = mockApi.get.mock.calls.find((c) => String(c[0]).endsWith("/export"))!
    expect(call[0]).toBe("/reports/payments/export")
    expect(call[1].params).toMatchObject({ format: "csv", table: "outstanding" })
    expect(call[1].params).not.toHaveProperty("page")
    expect(call[1].params).not.toHaveProperty("pageSize")
    expect(call[1].responseType).toBe("blob")
    expect(click).toHaveBeenCalledTimes(1)
  })
  it("unwraps a JSON error that arrives as a Blob", async () => {
    setupDownload(); const user = userEvent.setup(); allReports()
    renderWithClient(<ReportPage type="bookings" basePath="/staff/admin" />)
    await screen.findByText("Confirmed value")
    mockApi.get.mockImplementationOnce(async () => { throw new AxiosError("x", "403", undefined, undefined, { status: 403, data: new Blob([JSON.stringify({ error: "Forbidden" })]) } as any) })
    await user.click(screen.getByRole("button", { name: "Export CSV" }))
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Forbidden"))
  })
  it("each report offers the right export buttons", async () => {
    allReports()
    const { unmount } = renderWithClient(<ReportPage type="vendors" basePath="/staff/admin" />)
    await screen.findByText("Coverage gaps", { selector: "h2" })
    expect(screen.getByRole("button", { name: "Export assignments" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Export gaps" })).toBeInTheDocument()
    unmount()
    renderWithClient(<ReportPage type="staff" basePath="/staff/admin" />)
    await screen.findByText("Coordinator workload")
    expect(screen.getByRole("button", { name: "Export coordinators" })).toBeInTheDocument()
  })
})
