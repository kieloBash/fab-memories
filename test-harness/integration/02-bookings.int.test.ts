// test-harness/integration/02-bookings.int.test.ts
//
// Module 2 — Booking requests: client creates / edits / withdraws a PENDING request; staff list, filter, confirm, cancel.
import { DELETE as bookingDELETE, GET as bookingGET, PATCH as bookingPATCH } from "@/app/api/bookings/[bookingId]/route"
import { PATCH as termsPATCH } from "@/app/api/bookings/[bookingId]/contract-terms/route"
import { GET as availabilityGET } from "@/app/api/bookings/availability/route"
import { GET as bookingsGET, POST as bookingsPOST } from "@/app/api/bookings/route"
import { prisma } from "@/lib/prisma"
import { beforeAll, describe, expect, it } from "vitest"
import { daysFromNow, makeBooking, makePackage, makePayment, RUN, seedUsers, uniqueEventDate } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { actAs } from "./_support/session"
import { storySteps } from "./_support/steps"

let users: Awaited<ReturnType<typeof seedUsers>>
let pkg: { id: string }
let provincialPkg: { id: string }

beforeAll(async () => {
  users = await seedUsers()
  pkg = await makePackage({ price: 80_000, priceProvincial: 92_000 })
  provincialPkg = pkg
})

describe.sequential("Bookings — client request lifecycle", () => {
  const step = storySteps()
  let id = ""
  const date = uniqueEventDate()

  // Provincial pricing is a limitation in this version (PROVINCIAL_PRICING_ENABLED = false):
  // isProvincial from the client is ignored and the STANDARD price is used.
  step("CLIENT sends isProvincial → ignored, price is the package's STANDARD price", async () => {
    actAs("client_ben")
    const r = await call(bookingsPOST, {
      body: {
        packageId: provincialPkg.id, eventType: "DEBUT", eventDate: date, venue: `${RUN} Cebu hall`,
        guestCount: 150, clientPhone: "+639171234567", isProvincial: true, packageCustomizations: ["Extra LED wall"],
      },
    })
    expectStatus(r, 201)
    expect(Number(r.json.agreedPrice)).toBe(80_000)
    expect(r.json).toMatchObject({ status: "PENDING", isProvincial: false, packageCustomizations: ["Extra LED wall"] })
    id = r.json.id
  })

  step("CLIENT edits the pending request (guests, date) → 200, audited as UPDATE", async () => {
    actAs("client_ben")
    const newDate = uniqueEventDate()
    const r = await call(bookingPATCH, { method: "PATCH", params: { bookingId: id }, body: { guestCount: 180, eventDate: newDate } })
    expectStatus(r, 200)
    expect(r.json.guestCount).toBe(180)
    expect(r.json.eventDate.slice(0, 10)).toBe(newDate)
  })

  step("CLIENT opens it; staff can too", async () => {
    for (const who of ["client_ben", "admin", "coordinator"]) {
      actAs(who)
      expectStatus(await call(bookingGET, { params: { bookingId: id } }), 200)
    }
  })

  step("staff filter the list by status and event type", async () => {
    actAs("coordinator")
    const r = await call(bookingsGET, { query: { status: "PENDING", eventType: "DEBUT" } })
    expectStatus(r, 200)
    expect(r.json.some((b: any) => b.id === id)).toBe(true)
    expect(r.json.every((b: any) => b.status === "PENDING" && b.eventType === "DEBUT")).toBe(true)
  })

  step("CLIENT withdraws it (no payment yet) → deleted", async () => {
    actAs("client_ben")
    const r = await call(bookingDELETE, { method: "DELETE", params: { bookingId: id } })
    expectStatus(r, 200)
    expect(r.json).toEqual({ success: true })
    expect(await prisma.booking.findUnique({ where: { id } })).toBeNull()
  })
})

describe.sequential("Bookings — staff decisions", () => {
  it("COORDINATOR sets contract terms (FULL plan with a balance due date)", async () => {
    const b = await makeBooking({ clientId: users.anna.id, packageId: pkg.id, paymentPlan: null, depositAmount: null })
    actAs("coordinator")
    const r = await call(termsPATCH, {
      method: "PATCH", params: { bookingId: b.id },
      body: { paymentPlan: "FULL", depositAmount: 20_000, depositDueDate: daysFromNow(5), fullPaymentDueDate: daysFromNow(40) },
    })
    expectStatus(r, 200)
    expect(r.json.paymentPlan).toBe("FULL")
    expect(r.json.fullPaymentDueDate).not.toBeNull()
  })

  it("ADMIN confirms a pending booking that has a verified deposit → CONFIRMED, date held", async () => {
    const b = await makeBooking({ clientId: users.anna.id, packageId: pkg.id })
    await makePayment({ bookingId: b.id, status: "VERIFIED", verifiedById: users.admin.id })
    actAs("admin")
    const r = await call(bookingPATCH, { method: "PATCH", params: { bookingId: b.id }, body: { status: "CONFIRMED" } })
    expectStatus(r, 200)
    expect(r.json.status).toBe("CONFIRMED")
    const a = await call(availabilityGET, { query: { date: b.eventDate.toISOString().slice(0, 10) } })
    expect(a.json.available).toBe(false)
  })

  it("ADMIN cancels a pending booking with a reason → CANCELLED, client notified", async () => {
    const b = await makeBooking({ clientId: users.anna.id, packageId: pkg.id })
    actAs("admin")
    const r = await call(bookingPATCH, { method: "PATCH", params: { bookingId: b.id }, body: { status: "CANCELLED", cancellationReason: "Venue closed" } })
    expectStatus(r, 200)
    expect(r.json).toMatchObject({ status: "CANCELLED", cancellationReason: "Venue closed" })
    expect(await prisma.notification.count({ where: { userId: users.anna.id, type: "BOOKING_CANCELLED", link: { contains: b.id } } })).toBe(1)
  })
})
