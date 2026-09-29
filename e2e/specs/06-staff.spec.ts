// e2e/specs/06-staff.spec.ts
//
// Module 6 — Staff Scheduling (FR-36 to FR-40).
import { expect, test } from "@playwright/test"
import { CREDENTIALS } from "../support/env"
import { confirmedBooking, coordinatorId, createBooking, createPackage, freeDate } from "../support/data"
import { openAs, type Actor } from "../support/session"

test.describe.serial("Module 6 — staff scheduling", () => {
  let admin: Actor, coordinator: Actor, client: Actor, client2: Actor
  let packageId = ""
  let coord1 = "", coord2 = ""
  let booking: { id: string }

  test.beforeAll(async ({ browser }) => {
    admin = await openAs(browser, "admin")
    coordinator = await openAs(browser, "coordinator")
    client = await openAs(browser, "client")
    client2 = await openAs(browser, "client2")
    packageId = (await createPackage(admin)).id
    coord1 = await coordinatorId(admin, CREDENTIALS.coordinator.identifier)
    coord2 = await coordinatorId(admin, CREDENTIALS.coordinator2.identifier)
    booking = await confirmedBooking(admin, client, packageId, { guestCount: 120 })
  })
  test.afterAll(async () => { await Promise.all([admin, coordinator, client, client2].map((a) => a?.close())) })

  test("TC-FR36-01 Coordinator roster", async () => {
    const r = await coordinator.api.get("/api/staff")
    expect(r.status).toBe(200)
    const list: any[] = Array.isArray(r.json) ? r.json : r.json?.items ?? []
    const me = list.find((c) => c.id === coord1)
    expect(me).toBeTruthy()
    expect(typeof me.upcomingCount).toBe("number")
  })

  for (const [id, guests, min, max] of [["TC-FR37-01", 40, 4, 5], ["TC-FR37-02", 120, 7, 8], ["TC-FR37-03", 200, 8, 12]] as const) {
    test(`${id} Staffing recommendation for ${guests} guests`, async () => {
      const b = await createBooking(client, packageId, { guestCount: guests })
      const r = await admin.api.get(`/api/bookings/${b.id}/staff`, { compliance: "true" })
      expect(r.status).toBe(200)
      expect(r.json.recommendation).toMatchObject({ min, max })
    })
  }

  test("TC-FR38-01 Assign a coordinator with a task", async () => {
    const r = await admin.api.post(`/api/bookings/${booking.id}/staff`, { coordinatorId: coord1, taskRole: "LEAD_COORDINATOR", taskNote: "Ceremony lead" })
    expect(r.status, r.text).toBe(201)
    const mine = await coordinator.api.get("/api/staff/my-schedule")
    expect((mine.json as any[]).some((a) => a.booking?.id === booking.id)).toBe(true)
  })

  test("TC-FR39-01 Designate a backup coordinator", async () => {
    const r = await admin.api.post(`/api/bookings/${booking.id}/staff`, { coordinatorId: coord2, taskRole: "LOGISTICS", isBackup: true })
    expect(r.status, r.text).toBe(201)
    expect(r.json.isBackup).toBe(true)
    const c = await admin.api.get(`/api/bookings/${booking.id}/staff`, { compliance: "true" })
    expect(c.json.assignedCount).toBe(1) // backups do not count toward the ratio
  })

  test("TC-FR40-01 Conflict alert on a same-date assignment", async () => {
    // Two PENDING requests may share a date; the same coordinator on both is a conflict.
    const date = await freeDate(client)
    const a = await createBooking(client, packageId, { eventDate: date })
    const b = await createBooking(client2, packageId, { eventDate: date })
    expect((await admin.api.post(`/api/bookings/${a.id}/staff`, { coordinatorId: coord1, taskRole: "LOGISTICS" })).status).toBe(201)
    const check = await admin.api.get(`/api/bookings/${b.id}/staff`, { conflict: "true", coordinatorId: coord1 })
    expect(check.status).toBe(200)
    expect(check.json.hasConflict).toBe(true)
  })
})
