// test-harness/ui/audit-screens.test.tsx
//
// Happy paths for Module 7 on screen: stat cards, the log table (expand + paging), filters, and the
// user-initiated hash-chain verification.
import "./module-mocks"
import { AuditFiltersBar } from "@/features/audit/components/audit-filters-bar"
import { AuditLogTable } from "@/features/audit/components/audit-log-table"
import { AuditStatCards } from "@/features/audit/components/audit-stat-cards"
import { ChainIntegrityBadge } from "@/features/audit/components/chain-integrity-badge"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { mockApi, renderWithClient, routeGet } from "./utils"

const entry = (n: number, over: object = {}) => ({
  id: `e${n}`, sequence: n, userId: "u1", userName: "System Administrator", userRole: "ADMIN", action: "VERIFY", module: "PAYMENT",
  description: `ADMIN verified deposit #${n}`, status: "SUCCESS", metadata: { bookingId: "b1", paymentId: `p${n}` },
  hash: "a".repeat(64), previousHash: "b".repeat(64), createdAt: "2026-09-23T02:00:00.000Z", ...over,
})

describe("AuditStatCards", () => {
  it("shows totals, today, failures and the busiest module", async () => {
    routeGet({ "/audit/stats": { totalEntries: 206, entriesToday: 31, failureCount: 4, mostActiveModule: { module: "PAYMENT", count: 90 } } })
    renderWithClient(<AuditStatCards />)
    expect(await screen.findByText("206")).toBeInTheDocument()
    expect(screen.getByText("31")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("90 actions")).toBeInTheDocument()
  })
})

describe("AuditLogTable", () => {
  const page = { entries: [entry(12), entry(11, { userName: null, description: "System ran reminders" })], total: 40, page: 2, pageSize: 2, totalPages: 20 } as any

  it("lists entries (System for no user), expands one to show its hash and metadata", async () => {
    const user = userEvent.setup()
    renderWithClient(<AuditLogTable data={page} isLoading={false} onPageChange={vi.fn()} />)
    expect(screen.getByText("ADMIN verified deposit #12")).toBeInTheDocument()
    expect(screen.getByText("System")).toBeInTheDocument()
    await user.click(screen.getByText("ADMIN verified deposit #12"))
    expect(await screen.findByText("#12")).toBeInTheDocument()
    expect(screen.getByText("a".repeat(64))).toBeInTheDocument()
    expect(screen.getByText(/"paymentId": "p12"/)).toBeInTheDocument()
  })

  it("pages forward and back", async () => {
    const user = userEvent.setup(); const onPageChange = vi.fn()
    renderWithClient(<AuditLogTable data={page} isLoading={false} onPageChange={onPageChange} />)
    expect(screen.getByText(/Page 2 of 20 · 40 total entries/)).toBeInTheDocument()
    const [prev, next] = screen.getAllByRole("button")
    await user.click(next); await user.click(prev)
    expect(onPageChange.mock.calls).toEqual([[3], [1]])
  })

  it("an empty page says nothing matches", () => {
    renderWithClient(<AuditLogTable data={{ entries: [], total: 0, page: 1, pageSize: 25, totalPages: 0 }} isLoading={false} onPageChange={vi.fn()} />)
    expect(screen.getByText(/no audit log entries match/i)).toBeInTheDocument()
  })
})

describe("AuditFiltersBar", () => {
  it("search, dates and module filters each reset to page 1", async () => {
    const user = userEvent.setup(); const onChange = vi.fn()
    routeGet({ "/audit": { users: [{ id: "u1", fullName: "System Administrator" }] } })
    renderWithClient(<AuditFiltersBar filters={{ page: 4, pageSize: 25 }} onChange={onChange} />)
    await user.type(screen.getByPlaceholderText("Search descriptions…"), "d")
    expect(onChange).toHaveBeenLastCalledWith({ page: 1, pageSize: 25, search: "d" })
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-09-01" } })
    expect(onChange).toHaveBeenLastCalledWith({ page: 1, pageSize: 25, from: "2026-09-01" })
    const comboboxes = screen.getAllByRole("combobox")
    await user.click(comboboxes[1]) // modules
    await user.click(await screen.findByRole("option", { name: "Payment" }))
    expect(onChange).toHaveBeenLastCalledWith({ page: 1, pageSize: 25, module: "PAYMENT" })
  })
})

describe("ChainIntegrityBadge", () => {
  it("running the check shows the verified result", async () => {
    const user = userEvent.setup()
    mockApi.get.mockResolvedValue({ data: { isValid: true, totalEntries: 206, brokenAtSequence: null, reason: null, verifiedAt: "2026-09-23T02:00:00.000Z" } })
    renderWithClient(<ChainIntegrityBadge />)
    await user.click(screen.getByRole("button", { name: /run integrity check/i }))
    expect(await screen.findByText(/all 206 entries intact, chain unbroken/i)).toBeInTheDocument()
    expect(mockApi.get).toHaveBeenCalledWith("/audit/verify")
    expect(screen.getByRole("button", { name: /re-run check/i })).toBeInTheDocument()
  })

  it("a broken chain names the entry and the reason", async () => {
    const user = userEvent.setup()
    mockApi.get.mockResolvedValue({ data: { isValid: false, totalEntries: 206, brokenAtSequence: 57, reason: "content does not match its hash", verifiedAt: "2026-09-23T02:00:00.000Z" } })
    renderWithClient(<ChainIntegrityBadge />)
    await user.click(screen.getByRole("button", { name: /run integrity check/i }))
    expect(await screen.findByText(/failed at entry #57 of 206/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText("content does not match its hash")).toBeInTheDocument())
  })
})
