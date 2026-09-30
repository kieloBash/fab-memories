// features/packages/packages.schema.ts

import { z } from "zod"
import { ACTIVE_EVENT_TYPES } from "@/features/bookings/bookings.constants"


export const createPackageSchema = z.object({
  name: z.string().min(1, "Package name is required").max(100),
  description: z.string().max(500).optional(),
  eventType: z.enum(ACTIVE_EVENT_TYPES, {
    error: "Packages can only be for Wedding or Debut events",
  }),
  price: z
    .number({ error: "Price must be a number" })
    .positive("Price must be greater than 0")
    .multipleOf(0.01, "Price cannot have more than 2 decimal places"),
  inclusions: z
    .array(z.string().min(1))
    .min(1, "At least one inclusion is required"),
  isActive: z.boolean().default(true),
})

// NOT createPackageSchema.partial(): Zod's .default() on isActive survives .partial() (a well-known gotcha),
// so a PATCH that OMITS isActive would silently reset it to `true` — reactivating a package that was just
// deactivated the moment any OTHER field was edited. This schema is written out explicitly instead, with no
// defaults, so an omitted field truly means "leave unchanged" (see updatePackageRecord).
export const updatePackageSchema = z.object({
  name: z.string().min(1, "Package name is required").max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  eventType: z.enum(ACTIVE_EVENT_TYPES, { error: "Packages can only be for Wedding or Debut events" }).optional(),
  price: z.number({ error: "Price must be a number" }).positive("Price must be greater than 0").multipleOf(0.01, "Price cannot have more than 2 decimal places").optional(),
  inclusions: z.array(z.string().min(1)).min(1, "At least one inclusion is required").optional(),
  isActive: z.boolean().optional(),
})

export type CreatePackageInput = z.infer<typeof createPackageSchema>
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>
