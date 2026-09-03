// features/bookings/bookings.types.ts

import type { BookingStatus, EventType, PaymentPlan, VendorCategory } from "@/app/generated/prisma/client"
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

  // Vendor categories the client selected at booking time (FR-19)
  vendorCategories: VendorCategory[]

  // Contact
  clientPhone: string

  // Pricing
  isProvincial: boolean
  agreedPrice: string          // Decimal as string

  // Contract terms (set by admin)
  paymentPlan: PaymentPlan | null
  depositAmount: string | null // Decimal as string
  depositDueDate: string | null
  fullPaymentDueDate: string | null
  staffNote: string | null

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
