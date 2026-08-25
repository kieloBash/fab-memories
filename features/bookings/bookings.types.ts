// features/bookings/bookings.types.ts

import type { BookingStatus, EventType, Installment } from "@/app/generated/prisma/client"
import type { Package } from "@/features/packages"
import { Payment } from "../payments"

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
  eventDate: string       // ISO date string (Date-only)
  eventTime: string | null
  venue: string
  guestCount: number
  status: BookingStatus
  notes: string | null
  confirmedAt: string | null
  confirmedById: string | null
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

/** Availability check response */
export interface AvailabilityResult {
  date: string
  available: boolean
}
