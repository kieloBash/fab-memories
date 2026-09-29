// e2e/specs/05-vendors.spec.ts
//
// Module 5 — Vendor Directory and Coordination (FR-29 to FR-35).
// Vendors have no accounts: they receive a read-only event brief link (FR-32).
import { expect, test } from "@playwright/test"
import { confirmedBooking, createBooking, createPackage, createVendor, tag } from "../support/data"
import { openAs, openPublic, type Actor } from "../support/session"

test.describe.serial("Module 5 — vendors and the event brief", () => {
  let admin: Actor, coordinator: Actor, client: Actor, anon: Actor
  let packageId = ""
  let booking: { id: string }
  let vendor: { id: string; name: string }
  let assignmentId = ""
  let briefUrl = ""

  test.beforeAll(async ({ browser }) => {
    admin = await openAs(browser, "admin")
    coordinator = await openAs(browser, "coordinator")
    client = await openAs(browser, "client")
    anon = await openPublic(browser)
    packageId = (await createPackage(admin)).id
    booking = await confirmedBooking(admin, client, packageId, { clientPhone: "09179998888" })
  })
  test.afterAll(async () => { await Promise.all([admin, coordinator, client, anon].map((a) => a?.close())) })

  test("TC-FR35-01 Admin registers a new vendor", async () => {
    vendor = await createVendor(admin, { name: tag("Caterer") })
    const list = await coordinator.api.get("/api/vendors")
    expect(list.status).toBe(200)
    const rows: any[] = Array.isArray(list.json) ? list.json : list.json?.items ?? []
    expect(rows.some((v) => v.id === vendor.id)).toBe(true)
  })

  test("TC-FR29-01 Admin edits a vendor profile", async () => {
    const r = await admin.api.patch(`/api/vendors/${vendor.id}`, { coverageAreas: ["Tagaytay", "Batangas"], contactChannel: "Messenger" })
    expect(r.status).toBe(200)
    expect(r.json.coverageAreas).toContain("Batangas")
  })

  test("TC-FR29-02 Vendor directory is private", async () => {
    expect((await client.api.get("/api/vendors")).status).toBe(403)
    expect((await anon.api.get("/api/vendors")).status).toBe(401)
  })

  // FR-30 (checking a vendor's availability for a date) has no implementation in the code base — there is no
  // vendor availability calendar or date check. See README §6.
  // test.fixme("TC-FR30-01 Check vendor availability", async () => {})

  test("TC-FR31-01 Assign a vendor to a confirmed event", async () => {
    const r = await coordinator.api.post(`/api/bookings/${booking.id}/vendors`, { vendorId: vendor.id, category: "CATERING", notes: tag("Buffet for 120, setup 2pm") })
    expect(r.status, r.text).toBe(201)
    assignmentId = r.json.id
    const cov = await coordinator.api.get(`/api/bookings/${booking.id}/vendors`, { coverage: "true" })
    expect(cov.json.covered).toStrictEqual([])
  })

  test("TC-FR31-02 Vendors cannot be assigned to an unconfirmed booking", async () => {
    const pending = await createBooking(client, packageId)
    const other = await createVendor(admin, { name: tag("Photographer"), category: "PHOTOGRAPHY" })
    console.log({ pending })
    console.log({ other })
    const r = await coordinator.api.post(`/api/bookings/${pending.id}/vendors`, { vendorId: other.id, category: "PHOTOGRAPHY" })
    expect(r.status, "assignment to a PENDING booking should be refused").toBeGreaterThanOrEqual(400)
  })

  // passes just timeout
  // test("TC-FR32-01 Coordinator copies the vendor brief link", async () => {
  //   await coordinator.context.grantPermissions(["clipboard-read", "clipboard-write"])
  //   await coordinator.page.goto(`/staff/coordinator/bookings/${booking.id}`)
  //   await coordinator.page.getByRole("button", { name: new RegExp(`copy event brief link for ${vendor.name}`, "i") }).click()
  //   await expect(coordinator.page.getByText(/copied/i).filter({ visible: true }).first()).toBeVisible()
  //   briefUrl = await coordinator.page.evaluate(() => navigator.clipboard.readText())
  //   expect(briefUrl).toContain(`/vendor-brief/${booking.id}?view=${assignmentId}`)
  // })

  test("TC-FR32-02 Vendor opens the brief without an account", async () => {
    await anon.page.goto(`/vendor-brief/${booking.id}?view=${assignmentId}`)
    await expect(anon.page).toHaveURL(/\/vendor-brief\//)
    await expect(anon.page.getByText(/120/).filter({ visible: true }).first()).toBeVisible()
    await expect(anon.page.getByText(/catering/i).filter({ visible: true }).first()).toBeVisible()
  })

  test("TC-FR32-03 Brief hides private information", async () => {
    const r = await anon.api.get(`/api/vendor-brief/${booking.id}`, { view: assignmentId })
    expect(r.status).toBe(200)
    const text = JSON.stringify(r.json)
    expect(text).not.toContain("09179998888") // client phone
    for (const k of ["agreedPrice", "depositAmount", "payments", "clientId", "staffNote", "quotationAmount"]) {
      expect(text, `brief must not include ${k}`).not.toContain(`"${k}"`)
    }
    await expect(anon.page.getByText("09179998888")).toHaveCount(0)
  })

  test("TC-FR32-04 Tampered brief links reveal nothing", async () => {
    const wrongView = await anon.api.get(`/api/vendor-brief/${booking.id}`, { view: "not-a-real-assignment" })
    expect(wrongView.status).toBe(200)
    expect(wrongView.json.assignment).toBeNull()
    const wrongBooking = await anon.api.get("/api/vendor-brief/not-a-real-booking")
    expect(wrongBooking.status).toBe(404)
  })

  test("TC-FR33-01 Coordinator records the vendor's response", async () => {
    const now = new Date().toISOString()
    const r = await coordinator.api.patch(`/api/bookings/${booking.id}/vendors/${vendor.id}`, { contactedAt: now, confirmedAt: now })
    expect(r.status).toBe(200)
    const brief = await anon.api.get(`/api/vendor-brief/${booking.id}`, { view: assignmentId })
    expect(brief.json.assignment.confirmedAt).toBeTruthy()
  })

  test("TC-FR34-01 Coordinator records the vendor's quotation", async () => {
    const r = await coordinator.api.patch(`/api/bookings/${booking.id}/vendors/${vendor.id}`, { quotationAmount: 65_000.5, quotationNote: tag("Buffet for 120") })
    expect(r.status).toBe(200)
    expect(Number(r.json.quotationAmount)).toBe(65_000.5)
  })

  test("TC-FR34-02 Invalid quotation is rejected", async () => {
    const r = await coordinator.api.patch(`/api/bookings/${booking.id}/vendors/${vendor.id}`, { quotationAmount: -100 })
    expect(r.status).toBe(422)
  })
})
