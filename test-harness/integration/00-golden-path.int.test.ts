// test-harness/integration/00-golden-path.int.test.ts
//
// THE HAPPY PATH, END TO END, THROUGH THE REAL ROUTE HANDLERS.
// One booking's whole life, with every role taking their turn — nothing is created directly in the database.
//
//   public packages → availability → CLIENT books → ADMIN sets terms → CLIENT pays deposit → ADMIN verifies
//   (booking CONFIRMED, date held) → ADMIN sets installments → CLIENT pays #1 → COORDINATOR verifies → ADMIN records #2
//   by hand → coordinators + vendor assigned → public vendor brief → CLIENT requests cancellation → ADMIN declines
//   (stays confirmed) → history, notifications, audit chain, reports, CSV export, integrity all reflect it
//   → ADMIN finally cancels → client notified.
//
// Steps run in order and share state. If one fails, the rest are SKIPPED (not failed) so the report points at the
// first real problem instead of a wall of red.
import { GET as availabilityGET } from "@/app/api/bookings/availability/route"
import { GET as bookingGET, PATCH as bookingPATCH } from "@/app/api/bookings/[bookingId]/route"
import { POST as cancelRequestPOST } from "@/app/api/bookings/[bookingId]/cancel-request/route"
import { PATCH as termsPATCH } from "@/app/api/bookings/[bookingId]/contract-terms/route"
import { GET as historyGET } from "@/app/api/bookings/[bookingId]/history/route"
import { GET as installmentsGET, POST as installmentsPOST } from "@/app/api/bookings/[bookingId]/installments/route"
import { GET as bookingStaffGET, POST as bookingStaffPOST } from "@/app/api/bookings/[bookingId]/staff/route"
import { PATCH as bookingVendorPATCH } from "@/app/api/bookings/[bookingId]/vendors/[vendorId]/route"
import { GET as bookingVendorsGET, POST as bookingVendorsPOST } from "@/app/api/bookings/[bookingId]/vendors/route"
import { GET as bookingsGET, POST as bookingsPOST } from "@/app/api/bookings/route"
import { GET as auditGET } from "@/app/api/audit/route"
import { GET as auditVerifyGET } from "@/app/api/audit/verify/route"
import { GET as integrityGET } from "@/app/api/integrity/route"
import { PATCH as notificationPATCH } from "@/app/api/notifications/[id]/route"
import { GET as notificationsGET } from "@/app/api/notifications/route"
import { GET as paymentGET } from "@/app/api/payments/[paymentId]/route"
import { PATCH as verifyPATCH } from "@/app/api/payments/[paymentId]/verify/route"
import { POST as manualPOST } from "@/app/api/payments/manual/route"
import { POST as paymentsPOST } from "@/app/api/payments/route"
import { GET as publicPackagesGET } from "@/app/api/public/packages/route"
import { GET as reportExportGET } from "@/app/api/reports/[type]/export/route"
import { GET as bookingReportGET } from "@/app/api/reports/bookings/route"
import { GET as paymentReportGET } from "@/app/api/reports/payments/route"
import { GET as calendarGET } from "@/app/api/staff/calendar/route"
import { GET as myScheduleGET } from "@/app/api/staff/my-schedule/route"
import { GET as rosterGET } from "@/app/api/staff/route"
import { GET as vendorBriefGET } from "@/app/api/vendor-brief/[bookingId]/route"
import { POST as vendorsPOST } from "@/app/api/vendors/route"
import { prisma } from "@/lib/prisma"
import { beforeAll, describe, expect, it } from "vitest"
import { daysFromNow, makePackage, RUN, seedUsers, uniqueEventDate } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { actAs, signOut } from "./_support/session"
import { storySteps } from "./_support/steps"

/** A test that is skipped once an earlier step has failed (see _support/steps.ts). */
const step = storySteps()

const s = {} as {
  users: Awaited<ReturnType<typeof seedUsers>>
  packageId: string
  price: number
  eventDate: string
  bookingId: string
  depositId: string
  installmentIds: string[]
  vendorId: string
  bookingVendorId: string
}

describe.sequential("Golden path — one booking from request to cancellation, every role, real routes", () => {
  beforeAll(async () => {
    s.users = await seedUsers()
    // Our own package, so the price is known and the test never depends on the seed's catalogue.
    const pkg = await makePackage({ eventType: "WEDDING", price: 120_000, priceProvincial: 138_000 })
    s.packageId = pkg.id
    s.price = 120_000
    s.eventDate = uniqueEventDate()
  })

  step("1. anyone (signed out) can browse the active packages", async () => {
    signOut()
    const r = await call(publicPackagesGET)
    expectStatus(r, 200)
    const mine = r.json.find((p: any) => p.id === s.packageId)
    expect(mine).toMatchObject({ eventType: "WEDDING", inclusions: ["Coordination", "Styling"] })
    expect(Number(mine.price)).toBe(120_000)
  })

  step("2. CLIENT checks the date → available", async () => {
    actAs("client_anna")
    const r = await call(availabilityGET, { query: { date: s.eventDate } })
    expectStatus(r, 200)
    expect(r.json).toEqual({ date: s.eventDate, available: true })
  })

  step("3. CLIENT submits a booking request → 201 PENDING, price set by the SERVER from the package", async () => {
    actAs("client_anna")
    const r = await call(bookingsPOST, {
      body: {
        packageId: s.packageId,
        eventType: "WEDDING",
        eventDate: s.eventDate,
        eventTime: "15:00",
        venue: `${RUN} Golden Path Garden, Tagaytay`,
        guestCount: 120,
        clientPhone: "09171234567",
        notes: "Blush and gold motif",
        vendorCategories: ["CATERING", "PHOTOGRAPHY"],
        isProvincial: false,
      },
    })
    expectStatus(r, 201)
    expect(r.json.status).toBe("PENDING")
    expect(r.json.clientId).toBe(s.users.anna.id)
    expect(Number(r.json.agreedPrice)).toBe(s.price)
    s.bookingId = r.json.id
  })

  step("4. CLIENT sees it in their own list; ADMIN finds it by venue search", async () => {
    actAs("client_anna")
    let r = await call(bookingsGET)
    expectStatus(r, 200)
    expect(r.json.some((b: any) => b.id === s.bookingId)).toBe(true)

    actAs("admin")
    r = await call(bookingsGET, { query: { search: "Golden Path Garden" } })
    expectStatus(r, 200)
    expect(r.json.map((b: any) => b.id)).toContain(s.bookingId)
  })

  step("5. ADMIN sets the contract terms (installment plan, deposit)", async () => {
    actAs("admin")
    const r = await call(termsPATCH, {
      method: "PATCH",
      params: { bookingId: s.bookingId },
      body: { agreedPrice: 120_000, paymentPlan: "INSTALLMENT", depositAmount: 30_000, depositDueDate: daysFromNow(7), staffNote: "ITEST terms" },
    })
    expectStatus(r, 200)
    expect(r.json).toMatchObject({ paymentPlan: "INSTALLMENT" })
    expect(Number(r.json.depositAmount)).toBe(30_000)
  })

  step("6. CLIENT submits the deposit (reference number) → SUBMITTED, staff are notified", async () => {
    actAs("client_anna")
    const r = await call(paymentsPOST, {
      body: { bookingId: s.bookingId, paymentType: "DEPOSIT", method: "GCASH", amount: 30_000, referenceNumber: "ITEST-GC-0001" },
    })
    expectStatus(r, 201)
    expect(r.json).toMatchObject({ status: "SUBMITTED", paymentType: "DEPOSIT" })
    s.depositId = r.json.id

    const staffNote = await prisma.notification.findFirst({
      where: { userId: s.users.admin.id, type: "PAYMENT_SUBMITTED", link: { contains: s.depositId } },
    })
    expect(staffNote).not.toBeNull()
  })

  step("7. ADMIN opens the payment", async () => {
    actAs("admin")
    const r = await call(paymentGET, { params: { paymentId: s.depositId } })
    expectStatus(r, 200)
    expect(r.json).toMatchObject({ id: s.depositId, status: "SUBMITTED", referenceNumber: "ITEST-GC-0001" })
  })

  step("8. ADMIN verifies the deposit → payment VERIFIED, booking CONFIRMED, date now held", async () => {
    actAs("admin")
    const r = await call(verifyPATCH, { method: "PATCH", params: { paymentId: s.depositId }, body: { action: "VERIFY", verificationNote: "Received" } })
    expectStatus(r, 200)
    expect(r.json.status).toBe("VERIFIED")

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: s.bookingId } })
    expect(booking.status).toBe("CONFIRMED")
    expect(booking.depositVerifiedById).toBe(s.users.admin.id)

    actAs("client_ben")
    const a = await call(availabilityGET, { query: { date: s.eventDate } })
    expect(a.json.available).toBe(false)
  })

  step("9. ADMIN sets a 2-part installment schedule for the balance", async () => {
    actAs("admin")
    const r = await call(installmentsPOST, {
      params: { bookingId: s.bookingId },
      body: { installments: [
        { order: 1, dueDate: daysFromNow(30), amount: 45_000 },
        { order: 2, dueDate: daysFromNow(60), amount: 45_000, note: "Final" },
      ] },
    })
    expectStatus(r, 201)
    expect(r.json).toEqual({ count: 2 })
  })

  step("10. CLIENT sees both installments UNPAID", async () => {
    actAs("client_anna")
    const r = await call(installmentsGET, { params: { bookingId: s.bookingId } })
    expectStatus(r, 200)
    expect(r.json.map((i: any) => [i.order, i.status])).toEqual([[1, "UNPAID"], [2, "UNPAID"]])
    s.installmentIds = r.json.map((i: any) => i.id)
  })

  step("11. CLIENT pays installment #1; COORDINATOR verifies it → PAID", async () => {
    actAs("client_anna")
    const p = await call(paymentsPOST, {
      body: { bookingId: s.bookingId, paymentType: "INSTALLMENT", installmentId: s.installmentIds[0], method: "MAYA", amount: 45_000, referenceNumber: "ITEST-MY-0001" },
    })
    expectStatus(p, 201)

    actAs("coordinator")
    const v = await call(verifyPATCH, { method: "PATCH", params: { paymentId: p.json.id }, body: { action: "VERIFY" } })
    expectStatus(v, 200)
    const inst = await prisma.installment.findUniqueOrThrow({ where: { id: s.installmentIds[0] } })
    expect(inst.status).toBe("PAID")
  })

  step("12. ADMIN records installment #2 as a manual CASH payment → VERIFIED immediately, PAID", async () => {
    actAs("admin")
    const r = await call(manualPOST, {
      body: { bookingId: s.bookingId, paymentType: "INSTALLMENT", installmentId: s.installmentIds[1], method: "CASH", amount: 45_000, verificationNote: "Paid at the office" },
    })
    expectStatus(r, 201)
    expect(r.json.status).toBe("VERIFIED")
    const inst = await prisma.installment.findUniqueOrThrow({ where: { id: s.installmentIds[1] } })
    expect(inst.status).toBe("PAID")
  })

  step("13. ADMIN staffs the event: a lead coordinator and a backup", async () => {
    actAs("admin")
    const roster = await call(rosterGET)
    expectStatus(roster, 200)
    expect(roster.json.map((c: any) => c.id)).toEqual(expect.arrayContaining([s.users.coordinator.id, s.users.coordinator2.id]))

    const lead = await call(bookingStaffPOST, {
      params: { bookingId: s.bookingId },
      body: { coordinatorId: s.users.coordinator.id, taskRole: "LEAD_COORDINATOR", taskNote: "Program flow" },
    })
    expectStatus(lead, 201)
    const backup = await call(bookingStaffPOST, {
      params: { bookingId: s.bookingId },
      body: { coordinatorId: s.users.coordinator2.id, taskRole: "LOGISTICS", isBackup: true },
    })
    expectStatus(backup, 201)

    const compliance = await call(bookingStaffGET, { params: { bookingId: s.bookingId }, query: { compliance: "true" } })
    expectStatus(compliance, 200)
    expect(compliance.json).toMatchObject({ guestCount: 120, assignedCount: 1 }) // the backup does not count (FR-39)
  })

  step("14. the COORDINATOR sees the event on their schedule and the staffing calendar", async () => {
    actAs("coordinator")
    const mine = await call(myScheduleGET)
    expectStatus(mine, 200)
    expect(mine.json.some((a: any) => a.booking.id === s.bookingId)).toBe(true)

    const [y, m] = s.eventDate.split("-").map(Number)
    const cal = await call(calendarGET, { query: { year: y, month: m - 1 } })
    expectStatus(cal, 200)
    expect(cal.json.find((e: any) => e.bookingId === s.bookingId)).toMatchObject({ assignedCount: 1 })
  })

  step("15. ADMIN adds a caterer to the directory, assigns it, records a quotation and confirms it", async () => {
    actAs("admin")
    const v = await call(vendorsPOST, {
      body: { name: `${RUN} Golden Caterer`, category: "CATERING", contactPhone: "09170000002", contactChannel: "Viber", coverageAreas: ["Tagaytay"] },
    })
    expectStatus(v, 201)
    s.vendorId = v.json.id

    const a = await call(bookingVendorsPOST, { params: { bookingId: s.bookingId }, body: { vendorId: s.vendorId, category: "CATERING" } })
    expectStatus(a, 201)
    s.bookingVendorId = a.json.id

    const now = new Date().toISOString()
    const u = await call(bookingVendorPATCH, {
      method: "PATCH",
      params: { bookingId: s.bookingId, vendorId: s.vendorId },
      body: { contactedAt: now, confirmedAt: now, quotationAmount: 65_000.5, quotationNote: "Buffet for 120" },
    })
    expectStatus(u, 200)
    expect(Number(u.json.quotationAmount)).toBe(65_000.5)

    const coverage = await call(bookingVendorsGET, { params: { bookingId: s.bookingId }, query: { coverage: "true" } })
    expectStatus(coverage, 200)
    expect(coverage.json.covered).toContain("CATERING")
    expect(coverage.json.missing).toContain("PHOTOGRAPHY")
  })

  step("16. the vendor opens the public brief link — event details, no client personal data", async () => {
    signOut()
    const r = await call(vendorBriefGET, { params: { bookingId: s.bookingId }, query: { view: s.bookingVendorId } })
    expectStatus(r, 200)
    expect(r.json.booking).toMatchObject({ id: s.bookingId, guestCount: 120 })
    expect(r.json.assignment).toMatchObject({ id: s.bookingVendorId, category: "CATERING" })
    const text = JSON.stringify(r.json)
    expect(text).not.toContain("09171234567")        // client phone
    expect(text).not.toContain(s.users.anna.fullName) // client name
    expect(text).not.toContain("65000")               // the quotation is internal
  })

  step("17. CLIENT requests cancellation → CANCELLATION_REQUESTED", async () => {
    actAs("client_anna")
    const r = await call(cancelRequestPOST, {
      params: { bookingId: s.bookingId },
      body: { reason: "Family emergency — we may need to move the date." },
    })
    expectStatus(r, 200)
    expect(r.json.status).toBe("CANCELLATION_REQUESTED")
  })

  step("18. ADMIN declines the request → back to CONFIRMED", async () => {
    actAs("admin")
    const r = await call(bookingPATCH, { method: "PATCH", params: { bookingId: s.bookingId }, body: { status: "CONFIRMED" } })
    expectStatus(r, 200)
    expect(r.json.status).toBe("CONFIRMED")
  })

  step("19. the CLIENT's history timeline tells the story in order", async () => {
    actAs("client_anna")
    const r = await call(historyGET, { params: { bookingId: s.bookingId } })
    expectStatus(r, 200)
    const kinds: string[] = r.json.map((e: any) => e.kind)
    for (const k of ["requested", "terms_updated", "deposit_submitted", "deposit_verified", "cancellation_requested", "cancellation_declined"]) {
      expect(kinds, `history should contain "${k}"`).toContain(k)
    }
    expect(kinds.indexOf("requested")).toBeLessThan(kinds.indexOf("deposit_verified"))
  })

  step("20. ADMIN reads and marks the payment notification", async () => {
    actAs("admin")
    const list = await call(notificationsGET)
    expectStatus(list, 200)
    const n = list.json.items.find((x: any) => x.link?.includes(s.depositId))
    expect(n).toBeDefined()
    const r = await call(notificationPATCH, { method: "PATCH", params: { id: n.id } })
    expectStatus(r, 200)
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).isRead).toBe(true)
  })

  step("21. the audit trail recorded the actions, and the hash chain still verifies", async () => {
    actAs("admin")
    const list = await call(auditGET, { query: { module: "PAYMENT", pageSize: 100 } })
    expectStatus(list, 200)
    expect(JSON.stringify(list.json)).toContain(s.bookingId)

    const v = await call(auditVerifyGET)
    expectStatus(v, 200)
    expect(v.json.isValid).toBe(true)
  })

  step("22. reports include the booking and its three verified payments; CSV export works", async () => {
    actAs("admin")
    const b = await call(bookingReportGET, { query: { from: s.eventDate, to: s.eventDate } })
    expectStatus(b, 200)
    expect(b.json.rows.map((r: any) => r.bookingId)).toContain(s.bookingId)

    const p = await call(paymentReportGET, { query: { pageSize: 200 } })
    expectStatus(p, 200)
    expect(p.json.rows.filter((r: any) => r.bookingId === s.bookingId && r.status === "VERIFIED")).toHaveLength(3)

    const csv = await call(reportExportGET, { params: { type: "bookings" }, query: { from: s.eventDate, to: s.eventDate } })
    expectStatus(csv, 200)
    expect(csv.headers.get("content-type")).toMatch(/text\/csv/)
    expect(csv.text).toContain(s.bookingId)
  })

  step("23. the integrity checks find no rule violation caused by this booking", async () => {
    actAs("admin")
    const r = await call(integrityGET)
    expectStatus(r, 200)
    expect(r.json.checks.find((c: any) => c.id === "audit-chain").status).toBe("pass")
    expect(JSON.stringify(r.json.checks.find((c: any) => c.id === "rule-violations"))).not.toContain(s.bookingId)
  })

  step("24. ADMIN finally cancels the booking → CANCELLED, client notified, date released", async () => {
    actAs("admin")
    const r = await call(bookingPATCH, { method: "PATCH", params: { bookingId: s.bookingId }, body: { status: "CANCELLED", cancellationReason: "Client moved abroad" } })
    expectStatus(r, 200)
    expect(r.json.status).toBe("CANCELLED")

    const note = await prisma.notification.findFirst({ where: { userId: s.users.anna.id, type: "BOOKING_CANCELLED", link: { contains: s.bookingId } } })
    expect(note).not.toBeNull()

    actAs("client_ben")
    const a = await call(availabilityGET, { query: { date: s.eventDate } })
    expect(a.json.available).toBe(true)

    actAs("client_anna")
    const g = await call(bookingGET, { params: { bookingId: s.bookingId } })
    expect(g.json.status).toBe("CANCELLED")
  })
})
