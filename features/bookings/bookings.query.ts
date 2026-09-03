// features/bookings/bookings.query.ts
"use server"

import type { BookingStatus, EventType } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type {
  CreateBookingInput,
  SetContractTermsInput,
  UpdateBookingInput,
} from "./bookings.schema"

const WITH_RELATIONS = {
  client: { select: { id: true, fullName: true, email: true, username: true } },
  package: true,
  confirmedBy: { select: { id: true, fullName: true, role: true } },
  payments: true,
} as const

// ── Queries ───────────────────────────────────────────────────

export async function getAllBookings(filters?: {
  status?: BookingStatus
  eventType?: EventType
  from?: string
  to?: string
}) {
  return prisma.booking.findMany({
    where: {
      status: filters?.status,
      eventType: filters?.eventType,
      eventDate: {
        gte: filters?.from ? new Date(filters.from) : undefined,
        lte: filters?.to ? new Date(filters.to) : undefined,
      },
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
): Promise<boolean> {
  const start = new Date(date); start.setUTCHours(0, 0, 0, 0)
  const end = new Date(date); end.setUTCHours(23, 59, 59, 999)

  const count = await prisma.booking.count({
    where: {
      status: "CONFIRMED",
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
) {
  return prisma.booking.create({
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
) {
  const packageChanged = !!input.packageId && input.packageId !== existingPackageId
  const provincialChanged = input.isProvincial !== undefined && input.isProvincial !== existingIsProvincial

  let agreedPrice = existingAgreedPrice
  if (packageChanged || provincialChanged) {
    const targetPackageId = input.packageId ?? existingPackageId
    const targetProvincial = input.isProvincial ?? existingIsProvincial
    agreedPrice = await resolveAgreedPrice(targetPackageId, targetProvincial)
  }

  return prisma.booking.update({
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
) {
  return prisma.booking.update({
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

export async function deleteBookingRecord(id: string) {
  return prisma.booking.delete({ where: { id } })
}

export async function requestCancellationRecord(id: string, reason: string) {
  return prisma.booking.update({
    where: { id },
    data: {
      status: "CANCELLATION_REQUESTED",
      cancellationRequestReason: reason,
      cancellationRequestedAt: new Date(),
    },
    include: WITH_RELATIONS,
  })
}

export async function confirmBookingRecord(id: string, confirmedById: string) {
  return prisma.booking.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      confirmedBy: { connect: { id: confirmedById } },
    },
    include: WITH_RELATIONS,
  })
}

export async function cancelBookingRecord(id: string, reason: string) {
  return prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED", cancellationReason: reason },
    include: WITH_RELATIONS,
  })
}
