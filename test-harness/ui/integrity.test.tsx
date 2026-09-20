// test-harness/ui/integrity.test.tsx
import "./module-mocks"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError } from "axios"
import { describe, expect, it } from "vitest"
import SystemIntegrityPage from "@/app/(pages)/(protected)/staff/admin/audit/integrity/page"
import { ExportAuditButton } from "@/features/audit/components/export-audit-button"
import { IntegrityChecks } from "@/features/integrity/components/integrity-checks"
import real from "./fixtures/integrity.json"
import { mockApi, renderWithClient, routeGet, toastMock } from "./utils"

const REAL = real as any
const withStatuses = (s: Record<string, "pass" | "warn" | "fail">) => {
  const checks = REAL.checks.map((c: any) => ({ ...c, status: s[c.id] ?? "pass", remedy: (s[c.id] ?? "pass") === "pass" ? undefined : c.remedy ?? "Fix it." }))
  const overall = checks.some((c: any) => c.status === "fail") ? "fail" : checks.some((c: any) => c.status === "warn") ? "warn" : "pass"
  return { ...REAL, checks, overall }
}
const ALL = ["audit-chain", "audit-immutable", "one-per-date-index", "rule-violations", "audit-write-failures"]

describe("System integrity panel", () => {
  it("renders every check from a REAL report, with its status", async () => {
    routeGet({ "/integrity": REAL }); renderWithClient(<IntegrityChecks />)
    for (const id of ALL) expect(await screen.findByTestId(`check-${id}`)).toHaveAttribute("data-status", REAL.checks.find((c: any) => c.id === id).status)
    expect(screen.getByText("Audit trail is untampered")).toBeInTheDocument()
    expect(screen.getByText("Audit table is write-protected")).toBeInTheDocument()
    expect(screen.getByText("One booking per date is enforced by the database")).toBeInTheDocument()
    expect(screen.getByTestId("overall")).toHaveAttribute("data-status", REAL.overall)
  })

  it("a failing check shows the offending records AND what to do", async () => {
    routeGet({ "/integrity": REAL }); renderWithClient(<IntegrityChecks />)
    const failing = REAL.checks.find((c: any) => c.status !== "pass")
    const card = await screen.findByTestId(`check-${failing.id}`)
    expect(within(card).getByText(/What to do/)).toBeInTheDocument()
    for (const line of failing.detail.slice(0, 2)) expect(within(card).getByText(new RegExp(line.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeInTheDocument()
  })

  it("the unprotected-database warning points at the exact script to run", async () => {
    routeGet({ "/integrity": withStatuses({ "audit-immutable": "warn" }) })
    renderWithClient(<IntegrityChecks />)
    const card = await screen.findByTestId("check-audit-immutable")
    expect(card).toHaveAttribute("data-status", "warn")
    expect(card).toHaveTextContent(/create-restricted-role\.sql/)
    expect(card).toHaveTextContent(/RUNTIME_DATABASE_URL/)
  })

  it("all passing → the reassuring verdict and no remedies", async () => {
    routeGet({ "/integrity": withStatuses({}) }); renderWithClient(<IntegrityChecks />)
    expect(await screen.findByText("All integrity checks pass")).toBeInTheDocument()
    expect(screen.queryByText(/What to do/)).not.toBeInTheDocument()
    expect(screen.getByTestId("overall")).toHaveAttribute("data-status", "pass")
  })

  it("warnings only → 'Passing, with warnings'; any failure → 'Integrity problems found'", async () => {
    routeGet({ "/integrity": withStatuses({ "audit-immutable": "warn" }) })
    const a = renderWithClient(<IntegrityChecks />)
    expect(await screen.findByText("Passing, with warnings")).toBeInTheDocument(); a.unmount()
    routeGet({ "/integrity": withStatuses({ "audit-chain": "fail", "audit-immutable": "warn" }) })
    renderWithClient(<IntegrityChecks />)
    expect(await screen.findByText("Integrity problems found")).toBeInTheDocument()
  })

  it("'Run checks again' re-queries the server", async () => {
    const user = userEvent.setup(); routeGet({ "/integrity": REAL }); renderWithClient(<IntegrityChecks />)
    await screen.findByTestId("overall")
    const calls = mockApi.get.mock.calls.length
    await user.click(screen.getByRole("button", { name: /run checks again/i }))
    await waitFor(() => expect(mockApi.get.mock.calls.length).toBeGreaterThan(calls))
  })

  it("shows the API error instead of a blank page (e.g. not an admin)", async () => {
    mockApi.get.mockRejectedValue(new AxiosError("no", "403", undefined, undefined, { status: 403, data: { error: "Forbidden" } } as any))
    renderWithClient(<IntegrityChecks />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Forbidden")
  })

  it("the page links back to the audit trail", async () => {
    routeGet({ "/integrity": REAL }); renderWithClient(<SystemIntegrityPage />)
    expect(screen.getByRole("heading", { name: "System integrity" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /audit trail/i })).toHaveAttribute("href", "/staff/admin/audit")
  })
})

describe("Audit page export now uses the logged, working server export", () => {
  it("downloads /reports/audit/export with the page's filters — and never the old list endpoint", async () => {
    URL.createObjectURL = (() => "blob:x") as any; URL.revokeObjectURL = (() => {}) as any
    const user = userEvent.setup()
    mockApi.get.mockImplementation(async (url: string) => {
      if (url === "/reports/audit/export") return { data: new Blob(["a,b"]), headers: { "content-disposition": 'attachment; filename="audit-report-2026-09-20.csv"' } }
      throw new Error("Unexpected GET " + url)
    })
    renderWithClient(<ExportAuditButton filters={{ from: "2026-09-01", to: "2026-09-20", module: "PAYMENT", status: "FAILURE", search: "flag", page: 3, pageSize: 25 }} />)
    await user.click(screen.getByRole("button", { name: /export csv/i }))
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Downloaded audit-report-2026-09-20.csv"))
    const [url, cfg] = mockApi.get.mock.calls[0]
    expect(url).toBe("/reports/audit/export")
    expect(cfg.params).toMatchObject({ from: "2026-09-01", to: "2026-09-20", module: "PAYMENT", status: "FAILURE", search: "flag", format: "csv" })
    expect(cfg.params).not.toHaveProperty("page"); expect(cfg.params).not.toHaveProperty("pageSize")
    expect(mockApi.get.mock.calls.some((c) => c[0] === "/audit")).toBe(false)
  })

  it("a server refusal is shown as a readable message", async () => {
    const user = userEvent.setup()
    mockApi.get.mockRejectedValue(new AxiosError("no", "403", undefined, undefined, { status: 403, data: new Blob([JSON.stringify({ error: "Forbidden" })]) } as any))
    renderWithClient(<ExportAuditButton filters={{}} />)
    await user.click(screen.getByRole("button", { name: /export csv/i }))
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Forbidden"))
  })
})
