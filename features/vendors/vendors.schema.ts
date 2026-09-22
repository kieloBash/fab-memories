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

// A PATCH is a PARTIAL update: a field the client does not send is left UNCHANGED.
//   - omitted (key not sent)          -> unchanged
//   - null, or "" for a text field    -> explicitly CLEARED
//   - a value                         -> set to that value
// `name` and `category` cannot be cleared (they are required), only left out or replaced.
export const updateVendorSchema = z.object({
  name:           z.string().min(1, "Vendor name is required").max(150).optional(),
  category:       z.enum(VENDOR_CATEGORIES, { error: "Invalid category" }).optional(),
  contactName:    z.string().max(100).nullable().optional(),
  contactPhone:   z.string().max(20).nullable().optional(),
  contactEmail:   z.union([z.string().email("Invalid email"), z.literal(""), z.null()]).optional(),
  contactChannel: z.string().max(50).nullable().optional(),
  // Sending an ARRAY (including []) replaces the coverage list; omitting the field leaves it unchanged.
  coverageAreas:  z.array(z.string().min(1)).optional(),
  notes:          z.string().max(1000).nullable().optional(),
})

export const assignVendorSchema = z.object({
  vendorId:  z.string().min(1, "Vendor is required"),
  category:  z.enum(VENDOR_CATEGORIES, { error: "Invalid category" }),
  notes:     z.string().max(500).optional(),
})

// Same partial-update contract as updateVendorSchema above: omitted = unchanged, null = cleared.
export const updateBookingVendorSchema = z.object({
  notes:       z.string().max(500).nullable().optional(),
  contactedAt: z.string().nullable().optional(),  // ISO date string; null un-marks "contacted"
  confirmedAt: z.string().nullable().optional(),  // ISO date string; null un-marks "confirmed"

  // MODULE 8 (FR-54) — service quotation recorded against the assignment.
  // Entered by staff for now (vendors have no login yet). `null` clears it;
  // omitting the field leaves the stored value untouched.
  quotationAmount: z.number().nonnegative("Amount cannot be negative")
                    .max(99_999_999.99).multipleOf(0.01).nullable().optional(),
  quotationNote:   z.string().max(500).nullable().optional(),
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
