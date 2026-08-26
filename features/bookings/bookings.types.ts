// features/bookings/bookings.types.ts

import type { BookingStatus, EventType } from "@/app/generated/prisma/client"
import type { Package } from "@/features/packages"
import type { Payment } from "@/features/payments"

export interface BookingClient {
  id: string
  fullName: string
  email: string | null
  username: string | null
}

export interface BookingConfirmedBy {
  id: string
  fullName: string
  role: string
}

export interface Booking {
  id: string
  clientId: string
  packageId: string
  eventType: EventType
  eventDate: string
  eventTime: string | null
  venue: string
  venueLatitude: number | null
  venueLongitude: number | null
  venueFormattedAddress: string | null
  guestCount: number
  status: BookingStatus
  notes: string | null
  packageCustomizations: string[]

  // ── Price locked at booking time ──────────────────────────
  isProvincial: boolean
  agreedPrice: string   // Decimal serialized as string from Prisma

  cancellationRequestReason: string | null
  cancellationRequestedAt: string | null
  depositVerifiedAt: string | null
  depositVerifiedById: string | null
  cancellationReason: string | null
  createdAt: string
  updatedAt: string
}

export interface BookingWithRelations extends Booking {
  client: BookingClient
  package: Package
  confirmedBy: BookingConfirmedBy | null
  payments: Payment[]
}

export interface AvailabilityResult {
  date: string
  available: boolean
}
