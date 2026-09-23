// test-harness/integration/_support/factories.ts
//
// Builds starting state DIRECTLY in the database, so each feature suite can test its own routes without depending
// on every other feature working. (The golden-path suite does the opposite: everything through the real routes.)
//
// Everything created here is tagged so cleanup.ts can find it:
//   Booking.venue / Vendor.name / Package.name start with "ITEST-", unavailability reasons start with "ITEST".
// Event dates are unique and far in the future (2080s), so the one-event-per-day index never collides with real data.
import type { EventType, PaymentMethod, PaymentPlan, PaymentType, VendorCategory } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export const TAG = "ITEST-"
export const RUN = `${TAG}${Date.now().toString(36)}`

const dates: { base: number; n: number } = ((globalThis as any).__itestDates ??= {
  base: Date.UTC(2080, 0, 1) + Math.floor(Math.random() * 3000) * 86_400_000,
  n: 0,
})

/** A fresh YYYY-MM-DD no other test (or real booking) uses. */
export function uniqueEventDate(): string {
  return new Date(dates.base + dates.n++ * 86_400_000).toISOString().slice(0, 10)
}

export function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
}

export async function seedUsers() {
  const find = async (username: string) => {
    const u = await prisma.user.findUnique({ where: { username } })
    if (!u) throw new Error(`Seed user "${username}" is missing — run the base seed.`)
    return u
  }
  const [admin, coordinator, coordinator2, vendor, anna, ben] = await Promise.all(
    ["admin", "coordinator", "coordinator2", "vendor", "client_anna", "client_ben"].map(find),
  )
  return { admin, coordinator, coordinator2, vendor, anna, ben }
}

export async function makePackage(over: { eventType?: EventType; price?: number; priceProvincial?: number | null; isActive?: boolean } = {}) {
  return prisma.package.create({
    data: {
      name: `${RUN} Package ${Math.random().toString(36).slice(2, 6)}`,
      description: "Integration-test package",
      eventType: over.eventType ?? "WEDDING",
      price: over.price ?? 100_000,
      priceProvincial: over.priceProvincial === undefined ? 115_000 : over.priceProvincial,
      inclusions: ["Coordination", "Styling"],
      isActive: over.isActive ?? true,
    },
  })
}

export interface MakeBookingOptions {
  clientId: string
  packageId: string
  status?: "PENDING" | "CONFIRMED" | "CANCELLATION_REQUESTED" | "CANCELLED"
  eventDate?: string
  guestCount?: number
  agreedPrice?: number
  paymentPlan?: PaymentPlan | null
  depositAmount?: number | null
  vendorCategories?: VendorCategory[]
  confirmedById?: string
  label?: string
}

export async function makeBooking(o: MakeBookingOptions) {
  const confirmedLike = o.status === "CONFIRMED" || o.status === "CANCELLATION_REQUESTED"
  return prisma.booking.create({
    data: {
      clientId: o.clientId,
      packageId: o.packageId,
      eventType: "WEDDING",
      eventDate: new Date(o.eventDate ?? uniqueEventDate()),
      venue: `${RUN} ${o.label ?? "venue"}, Tagaytay`,
      guestCount: o.guestCount ?? 120,
      clientPhone: "09171234567",
      agreedPrice: o.agreedPrice ?? 100_000,
      paymentPlan: o.paymentPlan === undefined ? "FULL" : o.paymentPlan,
      depositAmount: o.depositAmount === undefined ? 25_000 : o.depositAmount,
      depositDueDate: new Date(daysFromNow(7)),
      fullPaymentDueDate: new Date(daysFromNow(60)),
      vendorCategories: o.vendorCategories ?? [],
      status: o.status ?? "PENDING",
      ...(confirmedLike && o.confirmedById ? { depositVerifiedAt: new Date(), depositVerifiedById: o.confirmedById } : {}),
      ...(o.status === "CANCELLATION_REQUESTED" ? { cancellationRequestReason: "ITEST reason", cancellationRequestedAt: new Date() } : {}),
    },
  })
}

export async function makePayment(o: {
  bookingId: string
  paymentType?: PaymentType
  method?: PaymentMethod
  amount?: number
  status?: "SUBMITTED" | "VERIFIED" | "FLAGGED"
  installmentId?: string
  verifiedById?: string
}) {
  const status = o.status ?? "SUBMITTED"
  return prisma.payment.create({
    data: {
      bookingId: o.bookingId,
      paymentType: o.paymentType ?? "DEPOSIT",
      method: o.method ?? "GCASH",
      amount: o.amount ?? 25_000,
      status,
      referenceNumber: `${TAG}REF-${Math.random().toString(36).slice(2, 8)}`,
      installmentId: o.installmentId ?? null,
      submittedAt: new Date(),
      ...(status !== "SUBMITTED" ? { verifiedById: o.verifiedById ?? null, verifiedAt: new Date() } : {}),
    },
  })
}

/** A CONFIRMED booking with its VERIFIED deposit — the state most post-confirmation features start from. */
export async function makeConfirmedBooking(o: Omit<MakeBookingOptions, "status"> & { adminId: string }) {
  const booking = await makeBooking({ ...o, status: "CONFIRMED", confirmedById: o.adminId })
  await makePayment({ bookingId: booking.id, amount: Number(booking.depositAmount ?? 25_000), status: "VERIFIED", verifiedById: o.adminId })
  return booking
}

export async function makeVendor(category: VendorCategory = "CATERING") {
  return prisma.vendor.create({
    data: {
      name: `${RUN} ${category} vendor`,
      category,
      contactPhone: "09170000001",
      contactChannel: "Viber",
      coverageAreas: ["Metro Manila"],
    },
  })
}

export function uniqueUsername(prefix = "itest") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}
