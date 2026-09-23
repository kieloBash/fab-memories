// features/bookings/bookings.query.ts

import type { BookingStatus, EventType } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { type DbClient, withTx } from "@/lib/db"
import { BOOKING_INCLUDE, HELD_STATUSES, transitionBooking } from "./bookings.transition"
import type {
  CreateBookingInput,
  SetContractTermsInput,
  UpdateBookingInput,
} from "@/features/bookings/bookings.schema"

const WITH_RELATIONS = BOOKING_INCLUDE

// ── Queries ───────────────────────────────────────────────────

export async function getAllBookings(filters?: {
  status?: BookingStatus
  eventType?: EventType
  from?: string
  to?: string
  search?: string
}) {
  const search = filters?.search?.trim()
  return prisma.booking.findMany({
    where: {
      status: filters?.status,
      eventType: filters?.eventType,
      eventDate: {
        gte: filters?.from ? new Date(filters.from) : undefined,
        lte: filters?.to ? new Date(filters.to) : undefined,
      },
      // Server-side search by client name or venue (case-insensitive) — used by both the admin and
      // coordinator booking lists.
      ...(search
        ? { OR: [
            { client: { fullName: { contains: search, mode: "insensitive" } } },
            { venue: { contains: search, mode: "insensitive" } },
          ] }
        : {}),
    },
    include: WITH_RELATIONS,
    orderBy: { eventDate: "asc" },
  })
}

export async function getBookingsByClientId(clientId: string) {
  return prisma.booking.findMany({
    where: { clientId },
    include: WITH_RELATIONS,
    orderBy: { eventDate: "asc" },
  })
}

export async function getBookingById(id: string) {
  return prisma.booking.findUnique({ where: { id }, include: WITH_RELATIONS })
}

// ── Availability ──────────────────────────────────────────────

export async function isDateAvailable(
  date: string,
  excludeBookingId?: string,
  db: DbClient = prisma,
): Promise<boolean> {
  const start = new Date(date); start.setUTCHours(0, 0, 0, 0)
  const end = new Date(date); end.setUTCHours(23, 59, 59, 999)

  // MODULE 9: a date stays held while a cancellation request is undecided — otherwise it could be
  // resold, and "Decline & keep confirmed" would then create two confirmed events on one day.
  const count = await db.booking.count({
    where: {
      status: { in: HELD_STATUSES },
      eventDate: { gte: start, lte: end },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
    },
  })
  return count === 0
}

// ── Price resolution ──────────────────────────────────────────

export async function resolveAgreedPrice(
  packageId: string,
  isProvincial: boolean,
): Promise<number> {
  const pkg = await prisma.package.findUniqueOrThrow({ where: { id: packageId } })
  if (isProvincial && pkg.priceProvincial !== null) {
    return Number(pkg.priceProvincial)
  }
  return Number(pkg.price)
}

// ── Mutations ─────────────────────────────────────────────────

export async function createBookingRecord(
  clientId: string,
  input: CreateBookingInput,
  agreedPrice: number,
  db: DbClient = prisma,
) {
  return db.booking.create({
    data: {
      clientId,
      packageId: input.packageId,
      eventType: input.eventType,
      eventDate: new Date(input.eventDate),
      eventTime: input.eventTime ? new Date(`1970-01-01T${input.eventTime}`) : null,
      venue: input.venue,
      venueLatitude: input.venueLatitude ?? null,
      venueLongitude: input.venueLongitude ?? null,
      venueFormattedAddress: input.venueFormattedAddress ?? null,
      guestCount: input.guestCount,
      clientPhone: input.clientPhone,
      notes: input.notes,
      packageCustomizations: input.packageCustomizations ?? [],
      vendorCategories: input.vendorCategories ?? [],
      isProvincial: input.isProvincial ?? false,
      agreedPrice,
      status: "PENDING",
    },
    include: WITH_RELATIONS,
  })
}

export async function updateBookingRecord(
  id: string,
  input: UpdateBookingInput,
  existingPackageId: string,
  existingIsProvincial: boolean,
  existingAgreedPrice: number,
  db: DbClient = prisma,
) {
  const packageChanged = !!input.packageId && input.packageId !== existingPackageId
  const provincialChanged = input.isProvincial !== undefined && input.isProvincial !== existingIsProvincial

  let agreedPrice = existingAgreedPrice
  if (packageChanged || provincialChanged) {
    const targetPackageId = input.packageId ?? existingPackageId
    const targetProvincial = input.isProvincial ?? existingIsProvincial
    agreedPrice = await resolveAgreedPrice(targetPackageId, targetProvincial)
  }

  return db.booking.update({
    where: { id },
    data: {
      packageId: input.packageId,
      eventType: input.eventType,
      eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
      eventTime: input.eventTime ? new Date(`1970-01-01T${input.eventTime}`) : undefined,
      venue: input.venue,
      venueLatitude: input.venueLatitude ?? null,
      venueLongitude: input.venueLongitude ?? null,
      venueFormattedAddress: input.venueFormattedAddress ?? null,
      guestCount: input.guestCount,
      clientPhone: input.clientPhone,
      notes: input.notes,
      packageCustomizations: input.packageCustomizations ?? [],
      vendorCategories: input.vendorCategories,
      isProvincial: input.isProvincial,
      agreedPrice,
    },
    include: WITH_RELATIONS,
  })
}

/**
 * Admin sets contract terms after discussing with client.
 * Can update agreedPrice, paymentPlan, depositAmount,
 * depositDueDate, fullPaymentDueDate, and staffNote.
 * Only callable while booking is PENDING (enforced in the API route).
 */
export async function setContractTermsRecord(
  id: string,
  input: SetContractTermsInput,
  db: DbClient = prisma,
) {
  return db.booking.update({
    where: { id },
    data: {
      ...(input.agreedPrice !== undefined && { agreedPrice: input.agreedPrice }),
      ...(input.paymentPlan !== undefined && { paymentPlan: input.paymentPlan }),
      ...(input.depositAmount !== undefined && { depositAmount: input.depositAmount }),
      ...(input.depositDueDate !== undefined && {
        depositDueDate: new Date(input.depositDueDate),
      }),
      ...(input.fullPaymentDueDate !== undefined && {
        fullPaymentDueDate: new Date(input.fullPaymentDueDate),
      }),
      ...(input.staffNote !== undefined && { staffNote: input.staffNote }),
    },
    include: WITH_RELATIONS,
  })
}

export async function deleteBookingRecord(id: string, db: DbClient = prisma) {
  return db.booking.delete({ where: { id } })
}

export async function requestCancellationRecord(id: string, reason: string, db: DbClient = prisma) {
  return withTx(db, (tx) =>
    transitionBooking(tx, {
      bookingId: id,
      to: "CANCELLATION_REQUESTED",
      data: { cancellationRequestReason: reason, cancellationRequestedAt: new Date() },
    }),
  )
}

/**
 * Confirms a PENDING booking — or restores a CANCELLATION_REQUESTED one ("Decline & keep confirmed").
 * Requires a VERIFIED deposit and a free date; see bookings.transition.ts.
 */
export async function confirmBookingRecord(id: string, confirmedById: string, db: DbClient = prisma) {
  return withTx(db, (tx) => transitionBooking(tx, { bookingId: id, to: "CONFIRMED", actorId: confirmedById }))
}

export async function cancelBookingRecord(id: string, reason: string, db: DbClient = prisma) {
  return withTx(db, (tx) =>
    transitionBooking(tx, { bookingId: id, to: "CANCELLED", data: { cancellationReason: reason } }),
  )
}
