// test-harness/integration/05-staff-assignments.int.test.ts
//
// Module 5 — Staff scheduling: roster, assign / update / remove, FR-37 compliance, FR-40 conflicts, availability block.
import { DELETE as assignmentDELETE, PATCH as assignmentPATCH } from "@/app/api/bookings/[bookingId]/staff/[assignmentId]/route"
import { GET as staffGET, POST as staffPOST } from "@/app/api/bookings/[bookingId]/staff/route"
import { POST as unavailablePOST } from "@/app/api/staff/availability/route"
import { GET as calendarGET } from "@/app/api/staff/calendar/route"
import { GET as rosterGET } from "@/app/api/staff/route"
import { prisma } from "@/lib/prisma"
import { beforeAll, describe, expect, it } from "vitest"
import { makeConfirmedBooking, makePackage, seedUsers, uniqueEventDate } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { actAs } from "./_support/session"

let users: Awaited<ReturnType<typeof seedUsers>>
let pkgId = ""
beforeAll(async () => { users = await seedUsers(); pkgId = (await makePackage()).id })

describe.sequential("Staff assignments — assign, update, remove", () => {
  let bookingId = ""
  let assignmentId = ""
  let eventDate = ""

  beforeAll(async () => {
    const b = await makeConfirmedBooking({ clientId: users.anna.id, packageId: pkgId, adminId: users.admin.id, guestCount: 40 })
    bookingId = b.id
    eventDate = b.eventDate.toISOString().slice(0, 10)
  })

  it("the roster lists every coordinator with their load", async () => {
    actAs("coordinator")
    const r = await call(rosterGET)
    expectStatus(r, 200)
    const maria = r.json.find((c: any) => c.id === users.coordinator.id)
    expect(maria).toMatchObject({ fullName: users.coordinator.fullName, isActive: true })
    expect(typeof maria.upcomingCount).toBe("number")
  })

  it("the conflict check says the coordinator is free on that date", async () => {
    actAs("admin")
    const r = await call(staffGET, { params: { bookingId }, query: { conflict: "true", coordinatorId: users.coordinator2.id } })
    expectStatus(r, 200)
    expect(r.json.hasConflict).toBe(false)
  })

  it("ADMIN assigns a lead coordinator → 201, audited in STAFF_SCHEDULE", async () => {
    actAs("admin")
    const r = await call(staffPOST, { params: { bookingId }, body: { coordinatorId: users.coordinator2.id, taskRole: "LEAD_COORDINATOR", notes: "Arrive 7am" } })
    expectStatus(r, 201)
    expect(r.json).toMatchObject({ coordinatorId: users.coordinator2.id, taskRole: "LEAD_COORDINATOR", isBackup: false })
    expect(r.json.conflict.hasConflict).toBe(false)
    assignmentId = r.json.id
    expect(await prisma.auditLog.count({ where: { module: "STAFF_SCHEDULE", metadata: { path: ["bookingId"], equals: bookingId } } })).toBeGreaterThan(0)
  })

  it("compliance: 40 guests needs 4–5 coordinators; 1 assigned → not yet compliant", async () => {
    actAs("admin")
    const r = await call(staffGET, { params: { bookingId }, query: { compliance: "true" } })
    expectStatus(r, 200)
    expect(r.json).toMatchObject({ guestCount: 40, assignedCount: 1, isCompliant: false })
    expect(r.json.recommendation).toMatchObject({ min: 4, max: 5 })
  })

  it("COORDINATOR updates the assignment (task role, backup)", async () => {
    actAs("coordinator")
    const r = await call(assignmentPATCH, { method: "PATCH", params: { bookingId, assignmentId }, body: { taskRole: "GUEST_REGISTRATION", isBackup: true } })
    expectStatus(r, 200)
    expect(r.json).toMatchObject({ taskRole: "GUEST_REGISTRATION", isBackup: true })
  })

  it("the staffing calendar shows the event for its month", async () => {
    actAs("admin")
    const [y, m] = eventDate.split("-").map(Number)
    const r = await call(calendarGET, { query: { year: y, month: m - 1 } })
    expectStatus(r, 200)
    expect(r.json.some((e: any) => e.bookingId === bookingId)).toBe(true)
  })

  it("ADMIN removes the coordinator → gone from the booking", async () => {
    actAs("admin")
    expectStatus(await call(assignmentDELETE, { method: "DELETE", params: { bookingId, assignmentId } }), 200)
    const r = await call(staffGET, { params: { bookingId } })
    expect(r.json).toEqual([])
  })
})

describe("Staff assignments — respects a coordinator's own unavailability", () => {
  it("a coordinator marks a day off; assigning them to an event that day is refused (409), assigning someone else works", async () => {
    const b = await makeConfirmedBooking({ clientId: users.ben.id, packageId: pkgId, adminId: users.admin.id, eventDate: uniqueEventDate() })
    const date = b.eventDate.toISOString().slice(0, 10)
    actAs("coordinator4")
    expectStatus(await call(unavailablePOST, { body: { date, reason: "ITEST family trip" } }), 201)

    const c4 = await prisma.user.findUniqueOrThrow({ where: { username: "coordinator4" } })
    actAs("admin")
    const blocked = await call(staffPOST, { params: { bookingId: b.id }, body: { coordinatorId: c4.id, taskRole: "LOGISTICS" } })
    expect(blocked.status).toBe(409)
    expect(blocked.json.code).toBe("COORDINATOR_UNAVAILABLE")

    const ok = await call(staffPOST, { params: { bookingId: b.id }, body: { coordinatorId: users.coordinator.id, taskRole: "LOGISTICS" } })
    expectStatus(ok, 201)
  })
})
