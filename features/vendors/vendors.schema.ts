// features/vendors/vendors.schema.ts

import { z } from "zod"

const VENDOR_CATEGORIES = [
  "CATERING", "PHOTOGRAPHY", "VIDEOGRAPHY", "FLORALS", "DECORATION",
  "SOUNDS_LIGHTING", "VENUE", "HAIR_MAKEUP", "ENTERTAINMENT", "TRANSPORTATION", "OTHER",
] as const

export const createVendorSchema = z.object({
  name:           z.string().min(1, "Vendor name is required").max(150),
  category:       z.enum(VENDOR_CATEGORIES, { error: "Invalid category" }),
  contactName:    z.string().max(100).optional(),
  contactPhone:   z.string().max(20).optional(),
  contactEmail:   z.string().email("Invalid email").optional().or(z.literal("")),
  contactChannel: z.string().max(50).optional(),
  coverageAreas:  z.array(z.string().min(1)).optional(),
  notes:          z.string().max(1000).optional(),
})

export const updateVendorSchema = createVendorSchema.partial()

export const assignVendorSchema = z.object({
  vendorId:  z.string().min(1, "Vendor is required"),
  category:  z.enum(VENDOR_CATEGORIES, { error: "Invalid category" }),
  notes:     z.string().max(500).optional(),
})

export const updateBookingVendorSchema = z.object({
  notes:       z.string().max(500).optional(),
  contactedAt: z.string().optional(),  // ISO date string
  confirmedAt: z.string().optional(),  // ISO date string
})

export const vendorFilterSchema = z.object({
  category: z.enum(VENDOR_CATEGORIES).optional(),
  isActive: z.boolean().optional(),
})

export type CreateVendorInput       = z.infer<typeof createVendorSchema>
export type UpdateVendorInput       = z.infer<typeof updateVendorSchema>
export type AssignVendorInput       = z.infer<typeof assignVendorSchema>
export type UpdateBookingVendorInput = z.infer<typeof updateBookingVendorSchema>
export type VendorFilterInput       = z.infer<typeof vendorFilterSchema>
export type VendorCategory          = typeof VENDOR_CATEGORIES[number]
