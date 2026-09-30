// e2e/specs/08-reports.spec.ts
//
// Module 8 — Real-Time Reporting and Decision Support (FR-52 to FR-58).
import { expect, test } from "@playwright/test"
import { createBooking, createPackage, setTerms, submitDeposit } from "../support/data"
import { openAs, type Actor } from "../support/session"

test.describe.serial("Module 8 — reports and dashboard", () => {
  let admin: Actor, coordinator: Actor, client: Actor

  test.beforeAll(async ({ browser }) => {
    admin = await openAs(browser, "admin")
    coordinator = await openAs(browser, "coordinator")
    client = await openAs(browser, "client")
  })
  test.afterAll(async () => { await Promise.all([admin, coordinator, client].map((a) => a?.close())) })

  const reports: [string, string, "admin" | "coordinator"][] = [
    ["TC-FR52-01", "bookings", "coordinator"],
    ["TC-FR53-01", "payments", "admin"],
    ["TC-FR54-01", "vendors", "admin"],
    ["TC-FR55-01", "staff", "admin"],
    ["TC-FR56-01", "audit", "admin"],
  ]
  for (const [id, type, who] of reports) {
    test(`${id} ${type} report returns rows and a summary`, async () => {
      const actor = who === "admin" ? admin : coordinator
      const r = await actor.api.get(`/api/reports/${type}`, { page: 1, pageSize: 10 })
      expect(r.status).toBe(200)
      expect(Array.isArray(r.json.rows)).toBe(true)
      expect(r.json.summary).toBeDefined()
      await actor.page.goto(`/staff/${who}/reports/${type}`)
      // await expect(actor.page.locator("main")).toBeVisible()
    })
  }

  test("TC-FR57-01 Reports export as CSV", async () => {
    for (const type of ["bookings", "payments", "vendors", "staff"]) {
      const r = await coordinator.api.get(`/api/reports/${type}/export`, { format: "csv" })
      expect(r.status, `${type} export`).toBe(200)
      expect(r.contentType).toMatch(/text\/csv/)
      expect(r.disposition).toMatch(/\.csv/)
    }
    expect((await coordinator.api.get("/api/reports/audit/export", { format: "csv" })).status).toBe(403)
  })

  test("TC-FR57-02 Clients cannot access reports", async () => {
    for (const type of ["bookings", "payments"]) expect((await client.api.get(`/api/reports/${type}`)).status).toBe(403)
    await client.page.goto("/staff/admin/reports")
    await expect(client.page).toHaveURL(/\/portal/)
  })

  test("TC-FR58-01 Dashboard metrics match the records", async () => {
    const d = await admin.api.get("/api/reports/dashboard")
    expect(d.status).toBe(200)
    expect(d.json).toEqual(expect.objectContaining({
      activeBookingsCount: expect.any(Number), paymentsToVerifyCount: expect.any(Number), needsAttention: expect.any(Array),
    }))
    const queue = await admin.api.get("/api/payments", { status: "SUBMITTED" })
    expect(d.json.paymentsToVerifyCount).toBe((queue.json as any[]).length)
    await admin.page.goto("/staff/admin")
    // await expect(admin.page.locator("main")).toBeVisible()
  })

  test("TC-FR58-02 Dashboard updates without a manual refresh", async () => {
    const before = (await admin.api.get("/api/reports/dashboard")).json.paymentsToVerifyCount as number
    await admin.page.goto("/staff/admin")
    const pkg = await createPackage(admin)
    const b = await createBooking(client, pkg.id)
    await setTerms(admin, b.id)
    await submitDeposit(client, b.id)
    // The dashboard re-queries every 30 s (features/reports/reports.hooks.ts). Watch the page's own requests.
    const refreshed = await admin.page.waitForResponse(
      async (res) => res.url().includes("/api/reports/dashboard") && res.ok() && (await res.json()).paymentsToVerifyCount === before + 1,
      { timeout: 45_000 },
    )
    expect(refreshed.ok()).toBe(true)
  })
})
