// features/vendors/vendors.query.ts
"use server"

import { prisma } from "@/lib/prisma"
import type { VendorCategory } from "@/app/generated/prisma/client"
import type {
  AssignVendorInput,
  CreateVendorInput,
  UpdateBookingVendorInput,
  UpdateVendorInput,
} from "./vendors.schema"

// ── Vendor CRUD ───────────────────────────────────────────────

export async function getAllVendors(filters?: {
  category?: VendorCategory
  isActive?: boolean
}) {
  return prisma.vendor.findMany({
    where: {
      category: filters?.category,
      isActive: filters?.isActive,
    },
    include: { _count: { select: { assignments: true } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  })
}

export async function getVendorById(id: string) {
  return prisma.vendor.findUnique({
    where: { id },
    include: {
      _count: { select: { assignments: true } },
      assignments: {
        include: {
          booking: {
            select: {
              id: true, eventType: true, eventDate: true, venue: true, status: true,
              client: { select: { id: true, fullName: true } },
            },
          },
        },
        orderBy: { booking: { eventDate: "asc" } },
        take: 10,
      },
    },
  })
}

export async function createVendorRecord(input: CreateVendorInput) {
  return prisma.vendor.create({
    data: {
      name: input.name,
      category: input.category,
      contactName: input.contactName ?? null,
      contactPhone: input.contactPhone ?? null,
      contactEmail: input.contactEmail || null,
      contactChannel: input.contactChannel ?? null,
      coverageAreas: input.coverageAreas ?? [],
      notes: input.notes ?? null,
    },
    include: { _count: { select: { assignments: true } } },
  })
}

export async function updateVendorRecord(id: string, input: UpdateVendorInput) {
  return prisma.vendor.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      contactName: input.contactName ?? null,
      contactPhone: input.contactPhone ?? null,
      contactEmail: input.contactEmail || null,
      contactChannel: input.contactChannel ?? null,
      coverageAreas: input.coverageAreas ?? [],
      notes: input.notes ?? null,
      // isActive:       input.isActive,
    },
    include: { _count: { select: { assignments: true } } },
  })
}

export async function deleteVendorRecord(id: string) {
  return prisma.vendor.delete({ where: { id } })
}

// ── Booking vendor assignments ────────────────────────────────

export async function getBookingVendors(bookingId: string) {
  return prisma.bookingVendor.findMany({
    where: { bookingId },
    include: { vendor: true },
    orderBy: { createdAt: "asc" },
  })
}

/**
 * Returns how many OTHER bookings this vendor is assigned to
 * on the same event date — used for availability indicator (Suggestion 4).
 */
export async function getVendorDateConflicts(
  vendorId: string,
  eventDate: string,
  excludeBookingId?: string,
): Promise<number> {
  const start = new Date(eventDate); start.setUTCHours(0, 0, 0, 0)
  const end = new Date(eventDate); end.setUTCHours(23, 59, 59, 999)

  return prisma.bookingVendor.count({
    where: {
      vendorId,
      bookingId: excludeBookingId ? { not: excludeBookingId } : undefined,
      booking: {
        eventDate: { gte: start, lte: end },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
    },
  })
}

export async function assignVendorToBooking(
  bookingId: string,
  input: AssignVendorInput,
) {
  return prisma.bookingVendor.create({
    data: {
      bookingId,
      vendorId: input.vendorId,
      category: input.category,
      notes: input.notes ?? null,
    },
    include: { vendor: true },
  })
}

export async function updateBookingVendorRecord(
  bookingId: string,
  vendorId: string,
  input: UpdateBookingVendorInput,
) {
  return prisma.bookingVendor.update({
    where: { bookingId_vendorId: { bookingId, vendorId } },
    data: {
      notes: input.notes ?? null,
      contactedAt: input.contactedAt ? new Date(input.contactedAt) : null,
      confirmedAt: input.confirmedAt ? new Date(input.confirmedAt) : null,
    },
    include: { vendor: true },
  })
}

export async function removeVendorFromBooking(bookingId: string, vendorId: string) {
  return prisma.bookingVendor.delete({
    where: { bookingId_vendorId: { bookingId, vendorId } },
  })
}

/**
 * Suggestion 4 — checks if all client-requested vendor categories
 * have at least one CONFIRMED vendor assigned.
 * Returns the coverage summary used by the confirm booking gate.
 */
export async function getVendorCoverageForBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { vendorCategories: true },
  })
  const assignments = await prisma.bookingVendor.findMany({
    where: { bookingId },
    select: { category: true, confirmedAt: true },
  })

  const requested = booking?.vendorCategories ?? []
  const covered = assignments
    .filter((a) => a.confirmedAt !== null)
    .map((a) => a.category)

  const missing = requested.filter((cat) => !covered.includes(cat))

  return {
    requested,
    covered,
    missing,
    isFullyCovered: missing.length === 0,
  }
}
