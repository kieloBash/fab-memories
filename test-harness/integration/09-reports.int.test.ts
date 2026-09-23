// test-harness/integration/09-reports.int.test.ts
//
// Module 8 — Reports & monitoring: every report type, the dashboard, the risk register and CSV exports.
import { GET as exportGET } from "@/app/api/reports/[type]/export/route"
import { GET as auditReportGET } from "@/app/api/reports/audit/route"
import { GET as bookingsReportGET } from "@/app/api/reports/bookings/route"
import { GET as dashboardGET } from "@/app/api/reports/dashboard/route"
import { GET as paymentsReportGET } from "@/app/api/reports/payments/route"
import { GET as risksGET } from "@/app/api/reports/risks/route"
import { GET as staffReportGET } from "@/app/api/reports/staff/route"
import { GET as vendorsReportGET } from "@/app/api/reports/vendors/route"
import { describe, expect, it } from "vitest"
import { call, expectStatus } from "./_support/http"
import { actAs } from "./_support/session"

const reports = { bookings: bookingsReportGET, payments: paymentsReportGET, vendors: vendorsReportGET, staff: staffReportGET, audit: auditReportGET }

describe("Reports", () => {
  it.each(Object.keys(reports))("ADMIN views the %s report → rows + meta + summary", async (type) => {
    actAs("admin")
    const r = await call((reports as any)[type], { query: { page: 1, pageSize: 5 } })
    expectStatus(r, 200)
    expect(r.json.meta).toMatchObject({ page: 1, pageSize: 5 })
    expect(Array.isArray(r.json.rows)).toBe(true)
    expect(r.json.summary).toBeDefined()
  })

  it.each(["bookings", "payments", "vendors", "staff"])("a COORDINATOR can view the %s report too", async (type) => {
    actAs("coordinator")
    expectStatus(await call((reports as any)[type]), 200)
  })

  it("filters narrow the result (bookings by status)", async () => {
    actAs("admin")
    const r = await call(bookingsReportGET, { query: { bookingStatus: "CONFIRMED", pageSize: 100 } })
    expectStatus(r, 200)
    expect(r.json.rows.every((row: any) => row.status === "CONFIRMED")).toBe(true)
  })

  it.each(Object.keys(reports))("ADMIN exports the %s report as CSV (header row + data)", async (type) => {
    actAs("admin")
    const r = await call(exportGET, { params: { type } })
    expectStatus(r, 200)
    expect(r.headers.get("content-type")).toMatch(/text\/csv/)
    expect(r.headers.get("content-disposition")).toMatch(/attachment; filename=.*\.csv/)
    expect(r.text.split("\n").length).toBeGreaterThan(1)
  })

  it("the admin dashboard returns its counters, attention list and risk summary", async () => {
    actAs("admin")
    const r = await call(dashboardGET)
    expectStatus(r, 200)
    expect(r.json).toEqual(expect.objectContaining({
      activeBookingsCount: expect.any(Number), paymentsToVerifyCount: expect.any(Number), needsAttention: expect.any(Array),
    }))
  })

  it("the full risk register lists items with severity", async () => {
    actAs("admin")
    const r = await call(risksGET)
    expectStatus(r, 200)
    expect(r.json.summary).toEqual(expect.objectContaining({ total: expect.any(Number) }))
    for (const item of r.json.items) expect(["HIGH", "MEDIUM", "LOW"]).toContain(item.severity)
  })
})
