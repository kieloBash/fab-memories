// features/vendors/vendors.types.ts

import type { VendorCategory } from "@/app/generated/prisma/client"

export interface Vendor {
  id:             string
  name:           string
  category:       VendorCategory
  contactName:    string | null
  contactPhone:   string | null
  contactEmail:   string | null
  contactChannel: string | null
  coverageAreas:  string[]
  notes:          string | null
  isActive:       boolean
  createdAt:      string
  updatedAt:      string
}

export interface VendorWithAssignmentCount extends Vendor {
  _count: { assignments: number }
}

export interface BookingVendor {
  id:          string
  bookingId:   string
  vendorId:    string
  category:    VendorCategory
  notes:       string | null
  contactedAt: string | null
  confirmedAt: string | null
  createdAt:   string
  updatedAt:   string
  vendor:      Vendor
}

/** Summary of vendor coverage for a booking — used in Suggestion 4 gate */
export interface VendorCoverageCheck {
  requested: VendorCategory[]
  covered:   VendorCategory[]   // categories with at least one confirmed vendor
  missing:   VendorCategory[]   // requested but no confirmed vendor yet
  isFullyCovered: boolean
}
