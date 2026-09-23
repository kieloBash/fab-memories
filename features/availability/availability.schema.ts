// features/availability/availability.schema.ts

import { z } from "zod"

export const addUnavailableDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  reason: z.string().max(200).optional(),
})
export type AddUnavailableDayInput = z.infer<typeof addUnavailableDaySchema>
