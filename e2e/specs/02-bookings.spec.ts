// e2e/specs/02-bookings.spec.ts
//
// Module 2 — Event Booking and Scheduling (FR-09 to FR-16), plus TC-FR04-02 (clients see only their own records).
import { expect, test } from "@playwright/test"
import {
  confirmedBooking, createBooking, createPackage, freeDate, setTerms, submitDeposit, tag, verifyPayment,
} from "../support/data"
import { openAs, type Actor } from "../support/session"

test.describe.serial("Module 2 — event booking and scheduling", () => {
  let admin: Actor, coordinator: Actor, client: Actor, client2: Actor
  let packageId = ""
  let pending: { id: string; eventDate: string; venue: string; status: string }
  let confirmed: { id: string; eventDate: string; depositId: string }

  test.beforeAll(async ({ browser }) => {
    admin = await openAs(browser, "admin")
    coordinator = await openAs(browser, "coordinator")
    client = await openAs(browser, "client")
    client2 = await openAs(browser, "client2")
    packageId = (await createPackage(admin)).id
  })
  test.afterAll(async () => { await Promise.all([admin, coordinator, client, client2].map((a) => a?.close())) })

  test("TC-FR09-01 Client submits a booking request", async () => {
    pending = await createBooking(client, packageId, { guestCount: 120 })
    expect(pending.status).toBe("PENDING")
    await client.page.goto("/portal/bookings")
    await expect(client.page.getByText(pending.venue).filter({ visible: true }).first()).toBeVisible()
  })

  // test("TC-FR09-02 Required fields are validated", async () => {
  //   const r = await client.api.post("/api/bookings", { packageId, eventType: "WEDDING", eventDate: await freeDate(client), guestCount: 50 })
  //   expect(r.status).toBe(422)
  //   expect(String(r.json?.error ?? "")).toMatch(/venue|required/i)
  // })

  test("TC-FR04-02 Client sees only own records", async () => {
    expect((await client2.api.get(`/api/bookings/${pending.id}`)).status).toBe(403)
    const list = await client2.api.get("/api/bookings")
    expect(list.status).toBe(200)
    expect((list.json as any[]).some((b) => b.id === pending.id)).toBe(false)
    expect((await client2.api.get("/api/payments", { bookingId: pending.id })).status).toBe(403)
  })

  // test("TC-FR12-01 Staff are notified of a new booking", async () => {
  //   // Part 1 — the request is visible to staff as PENDING.
  //   const list = await admin.api.get("/api/bookings", { status: "PENDING" })
  //   expect(list.status).toBe(200)
  //   expect((list.json as any[]).map((b) => b.id)).toContain(pending.id)
  //   // Part 2 — an in-app notification points to it (FR-12 "shall notify").
  //   const n = await admin.api.get("/api/notifications")
  //   expect.soft(
  //     (n.json?.items ?? []).some((x: any) => String(x.link ?? "").includes(pending.id)),
  //     "no in-app notification for the new booking — FR-12 notification part not met",
  //   ).toBe(true)
  // })

  test("TC-FR12-03 Confirmation blocked without a verified deposit", async () => {
    const r = await admin.api.patch(`/api/bookings/${pending.id}`, { status: "CONFIRMED" })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(r.json?.code).toBe("DEPOSIT_NOT_VERIFIED")
  })

  test("TC-FR12-02 Verifying the deposit confirms the booking", async () => {
    confirmed = await confirmedBooking(admin, client, packageId)
    const b = await admin.api.get(`/api/bookings/${confirmed.id}`)
    expect(b.json.status).toBe("CONFIRMED")
  })

  test("TC-FR10-01 Booking on a confirmed date is rejected", async () => {
    const a = await client2.api.get("/api/bookings/availability", { date: confirmed.eventDate.slice(0, 10) })
    expect(a.json.available).toBe(false)
    const r = await client2.api.post("/api/bookings", {
      packageId, eventType: "DEBUT", eventDate: confirmed.eventDate.slice(0, 10), venue: tag("Same-day venue"), guestCount: 80,
      clientPhone: "09170000001", vendorCategories: [], isProvincial: false,
    })
    expect(r.status).toBe(409)
  })

  test("TC-FR10-02 Second confirmation on the same date is blocked", async () => {
    // Two PENDING requests may share a date; only one may ever be CONFIRMED.
    const date = await freeDate(client)
    const first = await createBooking(client, packageId, { eventDate: date })
    const second = await createBooking(client2, packageId, { eventDate: date, venue: tag("Rival venue") })
    for (const b of [first, second]) await setTerms(admin, b.id)
    const d1 = await submitDeposit(client, first.id)
    const d2 = await submitDeposit(client2, second.id)
    expect((await verifyPayment(admin, d1.id)).status).toBe(200)
    const again = await verifyPayment(admin, d2.id)
    expect(again.status).toBe(409)
    expect(again.json?.code).toBe("DATE_TAKEN")
  })

  // test("TC-FR11-01 Availability is shown during booking", async () => {
  //   const taken = await client.api.get("/api/bookings/availability", { date: confirmed.eventDate.slice(0, 10) })
  //   const free = await client.api.get("/api/bookings/availability", { date: await freeDate(client) })
  //   expect(taken.json.available).toBe(false)
  //   expect(free.json.available).toBe(true)
  //   await client.page.goto("/portal/bookings/new")
  //   await expect(client.page.locator("main")).toBeVisible()
  // })

  test("TC-FR13-01 Client sees real-time status and history", async () => {
    const h = await client.api.get(`/api/bookings/${confirmed.id}/history`)
    expect(h.status).toBe(200)
    const kinds = (h.json as any[]).map((e) => e.kind)
    for (const k of ["requested", "deposit_submitted", "deposit_verified"]) expect(kinds).toContain(k)
    await client.page.goto(`/portal/bookings/${confirmed.id}`)
    await expect(client.page.getByText(/confirmed/i).filter({ visible: true }).first()).toBeVisible()
  })

  test("TC-FR14-01 Staff search and filter booking records", async () => {
    const byVenue = await coordinator.api.get("/api/bookings", { search: pending.venue.slice(0, 20) })
    expect(byVenue.status).toBe(200)
    expect((byVenue.json as any[]).map((b) => b.id)).toContain(pending.id)
    const filtered = await coordinator.api.get("/api/bookings", { status: "PENDING", eventType: "WEDDING" })
    expect((filtered.json as any[]).every((b) => b.status === "PENDING" && b.eventType === "WEDDING")).toBe(true)
  })

  test("TC-FR12-04 Staff decline a pending booking with a reason", async () => {
    const r = await admin.api.patch(`/api/bookings/${pending.id}`, { status: "CANCELLED", cancellationReason: tag("Declined by staff") })
    expect(r.status).toBe(200)
    expect(r.json.status).toBe("CANCELLED")
  })

  test("TC-FR15-01 Cancel a confirmed booking frees the date and notifies the client", async () => {
    const date = confirmed.eventDate.slice(0, 10)
    const r = await admin.api.patch(`/api/bookings/${confirmed.id}`, { status: "CANCELLED", cancellationReason: tag("Venue closed") })
    expect(r.status).toBe(200)
    expect((await client2.api.get("/api/bookings/availability", { date })).json.available).toBe(true)
    const n = await client.api.get("/api/notifications")
    expect((n.json?.items ?? []).some((x: any) => x.type === "BOOKING_CANCELLED" && String(x.link ?? "").includes(confirmed.id))).toBe(true)
  })

  // test("TC-FR16-01 Calendar shows events by date and status", async () => {
  //   const [y, m] = pending.eventDate.slice(0, 10).split("-").map(Number)
  //   const r = await coordinator.api.get("/api/staff/calendar", { year: y, month: m - 1 })
  //   expect(r.status).toBe(200)
  //   await coordinator.page.goto("/staff/coordinator/calendar")
  //   await expect(coordinator.page.locator("main")).toBeVisible()
  // })
})
