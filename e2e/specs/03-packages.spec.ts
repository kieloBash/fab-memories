// e2e/specs/03-packages.spec.ts
//
// Module 3 — Service Package Management (FR-17 to FR-20).
import { expect, test } from "@playwright/test"
import { createBooking, createPackage, freeDate, tag } from "../support/data"
import { openAs, openPublic, type Actor } from "../support/session"

test.describe.serial("Module 3 — service packages", () => {
  let admin: Actor, client: Actor, anon: Actor
  let pkg: { id: string }

  test.beforeAll(async ({ browser }) => {
    admin = await openAs(browser, "admin")
    client = await openAs(browser, "client")
    anon = await openPublic(browser)
  })
  test.afterAll(async () => { await Promise.all([admin, client, anon].map((a) => a?.close())) })

  test("TC-FR17-01 Admin creates a package", async () => {
    pkg = await createPackage(admin, { name: tag("Full Planning Wedding") })
    const pub = await anon.api.get("/api/public/packages")
    expect((pub.json as any[]).some((p) => p.id === pkg.id)).toBe(true)
    // Only in-scope event types are offered.
    expect((pub.json as any[]).every((p) => ["WEDDING", "DEBUT"].includes(p.eventType))).toBe(true)
    const corp = await admin.api.post("/api/packages", { name: tag("Corporate"), eventType: "CORPORATE", price: 50_000, inclusions: ["Emcee"] })
    expect(corp.status).toBe(422)
  })

  test("TC-FR17-02 Admin edits and deactivates a package", async () => {
    const e = await admin.api.patch(`/api/packages/${pkg.id}`, { inclusions: ["Coordination", "Styling", "Lights"] })
    expect(e.status).toBe(200)
    expect(e.json.inclusions).toContain("Lights")
    expect((await admin.api.patch(`/api/packages/${pkg.id}`, { isActive: false })).status).toBe(200)
    const pub = await anon.api.get("/api/public/packages")
    expect((pub.json as any[]).some((p) => p.id === pkg.id)).toBe(false)
    expect((await admin.api.patch(`/api/packages/${pkg.id}`, { isActive: true })).status).toBe(200)
  })

  // FR-18 (provincial pricing) is deferred to future development — a limitation in this version.
  // With PROVINCIAL_PRICING_ENABLED = false the public catalog shows one price and bookings ignore isProvincial.
  test("Provincial pricing is switched off (FR-18 deferred)", async () => {
    const pub = await anon.api.get("/api/public/packages")
    expect((pub.json as any[]).every((p) => p.priceProvincial === undefined)).toBe(true)
    const b = await createBooking(client, pkg.id, { isProvincial: true })
    expect((await admin.api.get(`/api/bookings/${b.id}`)).json.isProvincial).toBe(false)
  })

  test("TC-FR19-01 Package customizations are saved with the booking", async () => {
    const b = await createBooking(client, pkg.id, { packageCustomizations: ["Extra photo booth", "Add string lights"] })
    const r = await admin.api.get(`/api/bookings/${b.id}`)
    expect(r.json.packageCustomizations).toEqual(expect.arrayContaining(["Extra photo booth", "Add string lights"]))
  })

  test("TC-FR20-01 Package details stay linked to the booking after a price change", async () => {
    const b = await createBooking(client, pkg.id, { eventDate: await freeDate(client) })
    const before = Number(b.agreedPrice)
    expect((await admin.api.patch(`/api/packages/${pkg.id}`, { price: before + 5_000 })).status).toBe(200)
    const after = await admin.api.get(`/api/bookings/${b.id}`)
    expect(Number(after.json.agreedPrice)).toBe(before)
    expect(after.json.packageId ?? after.json.package?.id).toBe(pkg.id)
  })
})
