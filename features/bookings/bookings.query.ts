// features/bookings/bookings.query.ts
"use server"

import type { BookingStatus, EventType } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { CreateBookingInput } from "./bookings.schema"

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
  return prisma.booking.findUnique({
    where: { id },
    include: WITH_RELATIONS,
  })
}

// ── Availability ──────────────────────────────────────────────

/**
 * Returns true if no CONFIRMED booking exists for this calendar date.
 * Business rule: one confirmed event per day.
 */
export async function isDateAvailable(date: string): Promise<boolean> {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setUTCHours(23, 59, 59, 999)

  const count = await prisma.booking.count({
    where: {
      status: "CONFIRMED",
      eventDate: { gte: start, lte: end },
    },
  })

  return count === 0
}

// ── Mutations ─────────────────────────────────────────────────

export async function createBookingRecord(
  clientId: string,
  input: CreateBookingInput,
) {
  return prisma.booking.create({
    data: {
      clientId,
      packageId: input.packageId,
      eventType: input.eventType,
      eventDate: new Date(input.eventDate),
      eventTime: input.eventTime ? new Date(`1970-01-01T${input.eventTime}`) : null,
      venue: input.venue,
      guestCount: input.guestCount,
      notes: input.notes,
      status: "PENDING",
    },
    include: WITH_RELATIONS,
  })
}

export async function confirmBookingRecord(id: string, confirmedById: string) {
  return prisma.booking.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      // confirmedAt: new Date(),
      confirmedBy: {
        connect: {
          id: confirmedById
        }
      },
    },
    include: WITH_RELATIONS,
  })
}

export async function cancelBookingRecord(id: string, reason: string) {
  return prisma.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancellationReason: reason,
    },
    include: WITH_RELATIONS,
  })
}
