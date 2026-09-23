// test-harness/integration/06-coordinator-self-service.int.test.ts
//
// Module 5 — What a signed-in COORDINATOR sees about themselves: dashboard, schedule, availability.
import { DELETE as dayDELETE } from "@/app/api/staff/availability/[id]/route"
import { GET as daysGET, POST as dayPOST } from "@/app/api/staff/availability/route"
import { GET as dashboardGET } from "@/app/api/staff/my-dashboard/route"
import { GET as scheduleGET } from "@/app/api/staff/my-schedule/route"
import { prisma } from "@/lib/prisma"
import { beforeAll, describe, expect, it } from "vitest"
import { makeConfirmedBooking, makePackage, seedUsers, uniqueEventDate } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { actAs } from "./_support/session"

describe.sequential("Coordinator self-service", () => {
  let bookingId = ""

  beforeAll(async () => {
    const users = await seedUsers()
    const pkg = await makePackage()
    const b = await makeConfirmedBooking({ clientId: users.anna.id, packageId: pkg.id, adminId: users.admin.id })
    bookingId = b.id
    await prisma.staffAssignment.create({ data: { bookingId, coordinatorId: users.coordinator2.id, taskRole: "PROGRAM_FLOW" } })
  })

  it("my schedule lists the event I am assigned to, with its booking details", async () => {
    actAs("coordinator2")
    const r = await call(scheduleGET)
    expectStatus(r, 200)
    const mine = r.json.find((a: any) => a.booking.id === bookingId)
    expect(mine).toMatchObject({ taskRole: "PROGRAM_FLOW", booking: { status: "CONFIRMED" } })
  })

  it("my dashboard counts it as upcoming", async () => {
    actAs("coordinator2")
    const r = await call(dashboardGET)
    expectStatus(r, 200)
    expect(r.json).toEqual(expect.objectContaining({ upcomingCount: expect.any(Number), thisWeekCount: expect.any(Number), upcoming: expect.any(Array) }))
    expect(r.json.upcomingCount).toBeGreaterThan(0)
  })

  it("I mark a day unavailable, see it listed, and remove it again", async () => {
    actAs("coordinator2")
    const date = uniqueEventDate()
    const add = await call(dayPOST, { body: { date, reason: "ITEST seminar" } })
    expectStatus(add, 201)
    const list = await call(daysGET)
    expectStatus(list, 200)
    expect(list.json.some((d: any) => d.id === add.json.id)).toBe(true)
    const del = await call(dayDELETE, { method: "DELETE", params: { id: add.json.id } })
    expectStatus(del, 200)
    expect((await call(daysGET)).json.some((d: any) => d.id === add.json.id)).toBe(false)
  })
})
