// test-harness/ui/dashboard-and-risks.test.tsx
import "./module-mocks"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import AdminDashboardPage from "@/app/(pages)/(protected)/staff/admin/page"
import { RiskIndicatorsPanel } from "@/features/reports/components/risk-indicators-panel"
import { reportKeys } from "@/features/reports"
import dashboard from "./fixtures/dashboard.json"
import risks from "./fixtures/risks.json"
import { mockApi, renderWithClient, routeGet } from "./utils"

const D = dashboard as any
const R = risks as any

describe("Admin dashboard (FR-58)", () => {
  it("shows the risk panel, recent activity and a live stamp from the server payload", async () => {
    routeGet({ "/reports/dashboard": D })
    renderWithClient(<AdminDashboardPage />)
    const panel = await screen.findByTestId("risk-panel")
    await waitFor(() => expect(within(panel).getAllByTestId("risk-row")).toHaveLength(D.risks.length))
    expect(within(panel).getByText(`${D.riskSummary.high} high`)).toBeInTheDocument()
    expect(within(panel).getByText(`Showing the top ${D.risks.length} of ${D.riskSummary.total}`)).toBeInTheDocument()

    const feed = screen.getByTestId("audit-feed")
    expect(within(feed).getAllByRole("listitem")).toHaveLength(D.recentAudit.length)
    expect(within(feed).getAllByText(D.recentAudit[0].description).length).toBeGreaterThan(0)
    expect(screen.getByTestId("last-updated")).toHaveTextContent(/Live · updated/)
    // existing dashboard content is still there
    expect(screen.getByText("Needs attention")).toBeInTheDocument()
    expect(screen.getByText("Active bookings")).toBeInTheDocument()
  })

  it("auto-refreshes every 30 seconds and on window focus", async () => {
    routeGet({ "/reports/dashboard": D })
    const { client } = renderWithClient(<AdminDashboardPage />)
    await screen.findByTestId("risk-panel")
    const opts = client.getQueryCache().find({ queryKey: reportKeys.dashboard })!.options as any
    expect(opts.refetchInterval).toBe(30_000)
    expect(opts.refetchOnWindowFocus).toBe(true)
    expect(opts.refetchIntervalInBackground).toBe(false)
  })

  it("the Refresh button refetches", async () => {
    const user = userEvent.setup(); routeGet({ "/reports/dashboard": D })
    renderWithClient(<AdminDashboardPage />)
    await screen.findByTestId("risk-panel")
    const before = mockApi.get.mock.calls.length
    await user.click(screen.getByRole("button", { name: "Refresh dashboard" }))
    await waitFor(() => expect(mockApi.get.mock.calls.length).toBeGreaterThan(before))
  })
})

describe("Risk indicators panel", () => {
  it("orders by severity and links each risk to where it can be fixed", () => {
    renderWithClient(<RiskIndicatorsPanel risks={D.risks} summary={D.riskSummary} isLoading={false} />)
    const rows = screen.getAllByTestId("risk-row")
    const badges = rows.map((r) => within(r).getByText(/^(HIGH|MEDIUM|LOW)$/).textContent)
    const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as any
    expect(badges.every((b, i) => i === 0 || rank[badges[i - 1]!] <= rank[b!])).toBe(true)
    for (const row of rows) expect(row).toHaveAttribute("href", expect.stringMatching(/^\/staff\/admin\//))
  })

  it("empty state is reassuring, not blank", () => {
    renderWithClient(<RiskIndicatorsPanel risks={[]} summary={{ high: 0, medium: 0, low: 0, total: 0 }} isLoading={false} />)
    expect(screen.getByText(/No risks detected/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /view all/i })).not.toBeInTheDocument()
  })

  it("'View all' loads the full register only when opened", async () => {
    const user = userEvent.setup(); routeGet({ "/reports/risks": R })
    renderWithClient(<RiskIndicatorsPanel risks={D.risks} summary={D.riskSummary} isLoading={false} />)
    expect(mockApi.get).not.toHaveBeenCalled()                       // nothing fetched until asked
    await user.click(screen.getByRole("button", { name: `View all ${D.riskSummary.total}` }))
    const dialog = await screen.findByRole("dialog")
    await waitFor(() => expect(within(dialog).getAllByTestId("risk-row")).toHaveLength(R.items.length))
    expect(mockApi.get).toHaveBeenCalledWith("/reports/risks")
    expect(R.items.length).toBe(D.riskSummary.total)                 // register is complete
  })

  it("warns when a rule hit its row cap (counts are a floor)", async () => {
    const user = userEvent.setup(); routeGet({ "/reports/risks": { ...R, cappedKinds: ["PROOF_UNVERIFIED"] } })
    renderWithClient(<RiskIndicatorsPanel risks={D.risks} summary={D.riskSummary} isLoading={false} />)
    await user.click(screen.getByRole("button", { name: /view all/i }))
    expect(await screen.findByText(/counts are a minimum/i)).toBeInTheDocument()
  })
})
