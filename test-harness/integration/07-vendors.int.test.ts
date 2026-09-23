// test-harness/integration/07-vendors.int.test.ts
//
// Module 4 — Vendor directory (admin CRUD) and per-booking vendor coordination (assign, contact, quote, confirm, brief).
import { DELETE as bvDELETE, PATCH as bvPATCH } from "@/app/api/bookings/[bookingId]/vendors/[vendorId]/route"
import { GET as bvGET, POST as bvPOST } from "@/app/api/bookings/[bookingId]/vendors/route"
import { GET as briefGET } from "@/app/api/vendor-brief/[bookingId]/route"
import { DELETE as vendorDELETE, GET as vendorGET, PATCH as vendorPATCH } from "@/app/api/vendors/[vendorId]/route"
import { GET as vendorsGET, POST as vendorsPOST } from "@/app/api/vendors/route"
import { prisma } from "@/lib/prisma"
import { beforeAll, describe, expect, it } from "vitest"
import { makeBooking, makePackage, RUN, seedUsers } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { actAs, signOut } from "./_support/session"

describe.sequential("Vendor directory — admin CRUD", () => {
  let id = ""

  it("ADMIN adds a vendor → 201", async () => {
    actAs("admin")
    const r = await call(vendorsPOST, {
      body: { name: `${RUN} Lens & Light`, category: "PHOTOGRAPHY", contactName: "Jun", contactPhone: "09175550000", contactEmail: "jun@example.com", contactChannel: "Email", coverageAreas: ["Metro Manila", "Cavite"], notes: "₱25k/day" },
    })
    expectStatus(r, 201)
    expect(r.json).toMatchObject({ category: "PHOTOGRAPHY", isActive: true, coverageAreas: ["Metro Manila", "Cavite"] })
    id = r.json.id
  })

  it("staff list vendors by category and open one", async () => {
    actAs("coordinator")
    const list = await call(vendorsGET, { query: { category: "PHOTOGRAPHY" } })
    expectStatus(list, 200)
    expect(list.json.some((v: any) => v.id === id)).toBe(true)
    expect(list.json.every((v: any) => v.category === "PHOTOGRAPHY")).toBe(true)
    expectStatus(await call(vendorGET, { params: { vendorId: id } }), 200)
  })

  it("ADMIN edits it (clearing an optional field with null)", async () => {
    actAs("admin")
    const r = await call(vendorPATCH, { method: "PATCH", params: { vendorId: id }, body: { contactName: null, notes: "₱28k/day from 2027" } })
    expectStatus(r, 200)
    expect(r.json).toMatchObject({ contactName: null, notes: "₱28k/day from 2027" })
  })

  it("ADMIN deletes it", async () => {
    actAs("admin")
    expectStatus(await call(vendorDELETE, { method: "DELETE", params: { vendorId: id } }), 200)
    expect(await prisma.vendor.findUnique({ where: { id } })).toBeNull()
  })
})

describe.sequential("Booking vendors — coordinate a caterer for one event", () => {
  let bookingId = ""
  let vendorId = ""
  let assignmentId = ""

  beforeAll(async () => {
    const users = await seedUsers()
    const pkg = await makePackage()
    bookingId = (await makeBooking({ clientId: users.anna.id, packageId: pkg.id, vendorCategories: ["CATERING", "FLORALS"] })).id
    actAs("admin")
    vendorId = (await call(vendorsPOST, { body: { name: `${RUN} Feast Co`, category: "CATERING" } })).json.id
  })

  it("COORDINATOR assigns the caterer → 201 (no date conflicts)", async () => {
    actAs("coordinator")
    const r = await call(bvPOST, { params: { bookingId }, body: { vendorId, category: "CATERING", notes: "Agreed ₱650/head" } })
    expectStatus(r, 201)
    expect(r.json.conflicts).toBe(0) // number of other events the vendor has that day
    assignmentId = r.json.id
  })

  it("coverage before confirmation: nothing covered yet", async () => {
    actAs("coordinator")
    const r = await call(bvGET, { params: { bookingId }, query: { coverage: "true" } })
    expectStatus(r, 200)
    expect(r.json).toMatchObject({ requested: ["CATERING", "FLORALS"], covered: [], isFullyCovered: false })
  })

  it("mark contacted, record the quotation, then confirm — each update keeps the others", async () => {
    actAs("coordinator")
    const contactedAt = new Date().toISOString()
    let r = await call(bvPATCH, { method: "PATCH", params: { bookingId, vendorId }, body: { contactedAt } })
    expectStatus(r, 200)
    r = await call(bvPATCH, { method: "PATCH", params: { bookingId, vendorId }, body: { contactedAt, notes: "Agreed ₱650/head", quotationAmount: 78_000, quotationNote: "120 pax buffet" } })
    expectStatus(r, 200)
    r = await call(bvPATCH, { method: "PATCH", params: { bookingId, vendorId }, body: { contactedAt, notes: "Agreed ₱650/head", quotationAmount: 78_000, quotationNote: "120 pax buffet", confirmedAt: new Date().toISOString() } })
    expectStatus(r, 200)
    expect(r.json.confirmedAt).not.toBeNull()
    expect(Number(r.json.quotationAmount)).toBe(78_000)
  })

  it("coverage after confirmation: CATERING covered, FLORALS still missing", async () => {
    actAs("admin")
    const r = await call(bvGET, { params: { bookingId }, query: { coverage: "true" } })
    expect(r.json).toMatchObject({ covered: ["CATERING"], missing: ["FLORALS"] })
  })

  it("the CLIENT can see which vendors are on their event", async () => {
    actAs("client_anna")
    const r = await call(bvGET, { params: { bookingId } })
    expectStatus(r, 200)
    expect(r.json.map((a: any) => a.vendorId)).toEqual([vendorId])
  })

  it("the public brief (no ?view) shows the event without any vendor assignment", async () => {
    signOut()
    const r = await call(briefGET, { params: { bookingId } })
    expectStatus(r, 200)
    expect(r.json.assignment).toBeNull()
    expect(r.json.booking.vendorCategories).toEqual(["CATERING", "FLORALS"])
  })

  it("the brief for THIS vendor includes their scope note", async () => {
    signOut()
    const r = await call(briefGET, { params: { bookingId }, query: { view: assignmentId } })
    expect(r.json.assignment).toMatchObject({ notes: "Agreed ₱650/head", vendor: { category: "CATERING" } })
  })

  it("ADMIN removes the vendor from the booking", async () => {
    actAs("admin")
    expectStatus(await call(bvDELETE, { method: "DELETE", params: { bookingId, vendorId } }), 200)
    expect((await call(bvGET, { params: { bookingId } })).json).toEqual([])
  })
})
