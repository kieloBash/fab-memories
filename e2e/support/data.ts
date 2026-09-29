// e2e/support/data.ts
//
// Creates the records a test needs through the app's own API (the same routes the screens use),
// all tagged with E2E_TAG so e2e/scripts/cleanup-e2e-data.ts can remove them afterwards.
//
// Event dates are picked far in the future (2029–2030) so test bookings never take a date a real
// client could want, and each run starts at a random offset so reruns do not collide.
import { expect } from "@playwright/test"
import { TAG } from "./env"
import type { Actor } from "./session"

const RUN = Date.now().toString(36).slice(-5)
export const tag = (label: string) => `${TAG}${RUN} ${label}`

let dayOffset = Math.floor(Math.random() * 500)
const BASE = Date.UTC(2029, 0, 1)

/** A future date (YYYY-MM-DD) that the live system reports as available. */
export async function freeDate(actor: Actor): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const d = new Date(BASE + dayOffset++ * 86_400_000).toISOString().slice(0, 10)
    const r = await actor.api.get("/api/bookings/availability", { date: d })
    if (r.status === 200 && r.json?.available === true) return d
  }
  throw new Error("Could not find a free test date — check /api/bookings/availability.")
}

export const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

export async function createPackage(admin: Actor, over: Record<string, unknown> = {}) {
  const r = await admin.api.post("/api/packages", {
    name: tag("Garden Wedding"),
    description: "Automated test package",
    eventType: "WEDDING",
    price: 120_000,
    inclusions: ["Coordination", "Styling"],
    ...over,
  })
  expect(r.status, `create package → ${r.text}`).toBe(201)
  return r.json as { id: string; price: string | number; priceProvincial?: string | number }
}

export async function createBooking(client: Actor, packageId: string, over: Record<string, unknown> = {}) {
  const eventDate = (over.eventDate as string) ?? (await freeDate(client))
  const r = await client.api.post("/api/bookings", {
    packageId,
    eventType: "WEDDING",
    eventDate,
    eventTime: "15:00",
    venue: tag("Garden Venue, Tagaytay"),
    guestCount: 120,
    clientPhone: "09170000000",
    notes: "Blush and gold motif",
    vendorCategories: ["CATERING", "PHOTOGRAPHY"],
    isProvincial: false,
    ...over,
    ...(over.eventDate ? {} : { eventDate }),
  })
  expect(r.status, `create booking → ${r.text}`).toBe(201)
  return r.json as { id: string; eventDate: string; status: string; agreedPrice: string | number; venue: string }
}

/** Sets deposit terms so the client can pay (admin or coordinator). */
export async function setTerms(staff: Actor, bookingId: string, deposit = 30_000) {
  const r = await staff.api.patch(`/api/bookings/${bookingId}/contract-terms`, {
    agreedPrice: 120_000,
    paymentPlan: "INSTALLMENT",
    depositAmount: deposit,
    depositDueDate: daysFromNow(7),
    staffNote: tag("terms"),
  })
  expect(r.status, `contract terms → ${r.text}`).toBe(200)
}

export async function submitDeposit(client: Actor, bookingId: string, amount = 30_000, ref = tag("GC-DEP")) {
  const r = await client.api.post("/api/payments", {
    bookingId, paymentType: "DEPOSIT", method: "GCASH", amount, referenceNumber: ref.slice(0, 100),
  })
  expect(r.status, `submit deposit → ${r.text}`).toBe(201)
  return r.json as { id: string; status: string }
}

export async function verifyPayment(staff: Actor, paymentId: string) {
  return staff.api.patch(`/api/payments/${paymentId}/verify`, { action: "VERIFY", verificationNote: "E2E verified" })
}

/** Pending booking → terms → deposit → verified → CONFIRMED. */
export async function confirmedBooking(admin: Actor, client: Actor, packageId: string, over: Record<string, unknown> = {}) {
  const b = await createBooking(client, packageId, over)
  await setTerms(admin, b.id)
  const dep = await submitDeposit(client, b.id)
  const v = await verifyPayment(admin, dep.id)
  expect(v.status, `verify deposit → ${v.text}`).toBe(200)
  return { ...b, depositId: dep.id }
}

export async function createVendor(admin: Actor, over: Record<string, unknown> = {}) {
  const r = await admin.api.post("/api/vendors", {
    name: tag("Caterer"),
    category: "CATERING",
    contactPhone: "09170000002",
    contactChannel: "Viber",
    coverageAreas: ["Tagaytay"],
    ...over,
  })
  expect(r.status, `create vendor → ${r.text}`).toBe(201)
  return r.json as { id: string; name: string }
}

/** The database id of a coordinator, found in the roster by username. */
export async function coordinatorId(staff: Actor, username: string): Promise<string> {
  const r = await staff.api.get("/api/staff")
  expect(r.status).toBe(200)
  const list: any[] = Array.isArray(r.json) ? r.json : r.json?.items ?? []
  const c = list.find((x) => (x.username ?? x.coordinator?.username) === username)
  if (!c) throw new Error(`Coordinator "${username}" is not in the roster (GET /api/staff).`)
  return c.id ?? c.coordinator?.id
}
