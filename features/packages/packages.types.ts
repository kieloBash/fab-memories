// features/packages/packages.types.ts

import type { EventType } from "@/app/generated/prisma/client"

export interface Package {
  id: string
  name: string
  description: string | null
  eventType: EventType
  price: string          // Decimal serialized as string from Prisma
  priceProvincial: string
  inclusions: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PackageWithBookingCount extends Package {
  _count: {
    bookings: number
  }
}
