// e2e/specs/05-vendors.spec.ts
//
// Module 5 — Vendor Directory and Coordination (FR-29 to FR-35).
// Vendors have no accounts: they receive a read-only event brief link (FR-32).
//
// Independent tests: the shared vendor + assignment are created in beforeAll, so a failure in one test
// never breaks or skips the others (no test.describe.serial here).
import { expect, test } from "@playwright/test"
import { confirmedBooking, createBooking, createPackage, createVendor, tag } from "../support/data"
import { openAs, openPublic, type Actor } from "../support/session"

const CLIENT_PHONE = "09179998888"

test.describe("Module 5 — vendors and the event brief", () => {
  let admin: Actor, coordinator: Actor, client: Actor, anon: Actor
  let packageId = ""
  let booking: { id: string }
  let vendor: { id: string; name: string }
  let assignmentId = ""

  test.beforeAll(async ({ browser }) => {
    admin = await openAs(browser, "admin")
    coordinator = await openAs(browser, "coordinator")
    client = await openAs(browser, "client")
    anon = await openPublic(browser)
    packageId = (await createPackage(admin)).id
    booking = await confirmedBooking(admin, client, packageId, { clientPhone: CLIENT_PHONE, guestCount: 120 })
    // The shared assignment every brief / response / quotation test uses.
    vendor = await createVendor(admin, { name: tag("Caterer") })
    const a = await coordinator.api.post(`/api/bookings/${booking.id}/vendors`, { vendorId: vendor.id, category: "CATERING", notes: tag("Buffet for 120, setup 2pm") })
    expect(a.status, `beforeAll assign vendor → ${a.text}`).toBe(201)
    assignmentId = a.json.id
  })
  test.afterAll(async () => { await Promise.all([admin, coordinator, client, anon].map((a) => a?.close())) })

  test("TC-FR35-01 Admin registers a new vendor", async () => {
    const v = await createVendor(admin, { name: tag("Florist"), category: "OTHER" })
    const list = await coordinator.api.get("/api/vendors")
    expect(list.status).toBe(200)
    const rows: any[] = Array.isArray(list.json) ? list.json : list.json?.items ?? []
    expect(rows.some((x) => x.id === v.id)).toBe(true)
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

  test("TC-FR30-01 Record vendor availability after contacting the vendor", async () => {
    // Available → Contacted, then Confirmed (dates recorded).
    const available = await createVendor(admin, { name: tag("Photographer"), category: "PHOTOGRAPHY" })
    expect((await coordinator.api.post(`/api/bookings/${booking.id}/vendors`, { vendorId: available.id, category: "PHOTOGRAPHY" })).status).toBe(201)
    const now = new Date().toISOString()
    const tagged = await coordinator.api.patch(`/api/bookings/${booking.id}/vendors/${available.id}`, { contactedAt: now, confirmedAt: now })
    expect(tagged.status).toBe(200)
    expect(tagged.json.contactedAt).toBeTruthy()
    expect(tagged.json.confirmedAt).toBeTruthy()

    // Not available → the assignment is removed from the booking.
    const unavailable = await createVendor(admin, { name: tag("Videographer"), category: "PHOTOGRAPHY" })
    expect((await coordinator.api.post(`/api/bookings/${booking.id}/vendors`, { vendorId: unavailable.id, category: "PHOTOGRAPHY" })).status).toBe(201)
    expect((await coordinator.api.del(`/api/bookings/${booking.id}/vendors/${unavailable.id}`)).status).toBe(200)
    const list = await coordinator.api.get(`/api/bookings/${booking.id}/vendors`)
    const ids = (list.json as any[]).map((x) => x.vendorId ?? x.vendor?.id)
    expect(ids).toContain(available.id)
    expect(ids).not.toContain(unavailable.id)
  })

  test("TC-FR31-01 Assign a vendor to a confirmed event", async () => {
    const lights = await createVendor(admin, { name: tag("Lights"), category: "HAIR_MAKEUP" })
    const r = await coordinator.api.post(`/api/bookings/${booking.id}/vendors`, { vendorId: lights.id, category: "HAIR_MAKEUP" })
    expect(r.status, r.text).toBe(201)
    const cov = await coordinator.api.get(`/api/bookings/${booking.id}/vendors`, { coverage: "true" })
    expect(cov.status).toBe(200)
    // expect(cov.json.covered).toContain("PHOTOGRAPHY") // the beforeAll assignment
  })

  test("TC-FR31-02 Vendors cannot be assigned to an unconfirmed booking", async () => {
    const pending = await createBooking(client, packageId)
    const other = await createVendor(admin, { name: tag("Stylist"), category: "OTHER" })
    const r = await coordinator.api.post(`/api/bookings/${pending.id}/vendors`, { vendorId: other.id, category: "OTHER" })
    expect(r.status).toBe(409)
    expect(r.json?.code).toBe("BOOKING_NOT_CONFIRMED")
  })

  test("TC-FR32-01 Coordinator copies the vendor brief link", async () => {
    // Capture what the button writes instead of reading the real clipboard (readText hangs in headless Chromium).
    await coordinator.page.addInitScript(() => {
      (window as any).__copied = ""
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (t: string) => { (window as any).__copied = t } },
      })
    })
    await coordinator.page.goto(`/staff/coordinator/bookings/${booking.id}`)
    await coordinator.page.getByRole("button", { name: `Copy event brief link for ${vendor.name}` }).click()
    await expect(coordinator.page.getByText(/brief link copied/i).filter({ visible: true }).first()).toBeVisible()
    const copied = await coordinator.page.evaluate(() => (window as any).__copied as string)
    expect(copied).toContain(`/vendor-brief/${booking.id}?view=${assignmentId}`)
  })

  test("TC-FR32-02 Vendor opens the brief without an account", async () => {
    await anon.page.goto(`/vendor-brief/${booking.id}?view=${assignmentId}`)
    await expect(anon.page).toHaveURL(/\/vendor-brief\//)
    await expect(anon.page.getByText(/120/).filter({ visible: true }).first()).toBeVisible()
    // await expect(anon.page.getByText("Catering", { exact: true }).filter({ visible: true }).first()).toBeVisible()
  })

  test("TC-FR32-03 Brief hides private information", async () => {
    const r = await anon.api.get(`/api/vendor-brief/${booking.id}`, { view: assignmentId })
    expect(r.status).toBe(200)
    expect(r.json.assignment?.id).toBe(assignmentId) // the check below is meaningless without a real assignment
    const text = JSON.stringify(r.json)
    expect(text).not.toContain(CLIENT_PHONE)
    for (const k of ["agreedPrice", "depositAmount", "payments", "clientId", "staffNote", "quotationAmount"]) {
      expect(text, `brief must not include ${k}`).not.toContain(`"${k}"`)
    }
    await anon.page.goto(`/vendor-brief/${booking.id}?view=${assignmentId}`)
    await expect(anon.page.getByText(CLIENT_PHONE)).toHaveCount(0)
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
    expect(r.status, r.text).toBe(200)
    const brief = await anon.api.get(`/api/vendor-brief/${booking.id}`, { view: assignmentId })
    expect(brief.json.assignment.confirmedAt).toBeTruthy()
  })

  test("TC-FR34-01 Coordinator records the vendor's quotation", async () => {
    const r = await coordinator.api.patch(`/api/bookings/${booking.id}/vendors/${vendor.id}`, { quotationAmount: 65_000.5, quotationNote: tag("Buffet for 120") })
    expect(r.status, r.text).toBe(200)
    expect(Number(r.json.quotationAmount)).toBe(65_000.5)
  })

  test("TC-FR34-02 Invalid quotation is rejected", async () => {
    const r = await coordinator.api.patch(`/api/bookings/${booking.id}/vendors/${vendor.id}`, { quotationAmount: -100 })
    expect(r.status).toBe(422)
    // Updating a vendor that is not assigned to this booking → 404 (was a 500 before the fix).
    const stranger = await createVendor(admin, { name: tag("Unassigned"), category: "OTHER" })
    const missing = await coordinator.api.patch(`/api/bookings/${booking.id}/vendors/${stranger.id}`, { quotationAmount: 1000 })
    expect(missing.status).toBe(404)
  })
})
