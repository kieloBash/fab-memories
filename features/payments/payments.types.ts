// features/payments/payments.types.ts

import type { PaymentMethod, PaymentStatus, PaymentType } from "@/app/generated/prisma/client"

export interface PaymentVerifier {
  id: string
  fullName: string
  role: string
}

export interface PaymentBooking {
  id: string
  eventType: string
  eventDate: string
  venue: string
  status: string
  client: {
    id: string
    fullName: string
    email: string | null
  }
}

export interface Payment {
  id: string
  bookingId: string
  paymentType: PaymentType
  method: PaymentMethod
  status: PaymentStatus
  amount: string              // Decimal serialized as string
  proofImageUrl: string | null  // signed URL — generated server-side on fetch
  proofStoragePath: string | null
  referenceNumber: string | null
  verifiedById: string | null
  verifiedAt: string | null
  verificationNote: string | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PaymentWithRelations extends Payment {
  booking: PaymentBooking
  verifiedBy: PaymentVerifier | null
}
