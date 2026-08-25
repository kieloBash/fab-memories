// features/packages/packages.schema.ts

import { z } from "zod"

const EVENT_TYPES = ["WEDDING", "DEBUT", "CORPORATE", "BIRTHDAY", "OTHER"] as const

export const createPackageSchema = z.object({
  name: z.string().min(1, "Package name is required").max(100),
  description: z.string().max(500).optional(),
  eventType: z.enum(EVENT_TYPES, {
    error: `Event type must be one of: ${EVENT_TYPES.join(", ")}`,
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

export const updatePackageSchema = createPackageSchema.partial()

export type CreatePackageInput = z.infer<typeof createPackageSchema>
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>
