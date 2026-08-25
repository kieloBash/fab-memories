// features/bookings/bookings.schema.ts

import { z } from "zod"

const EVENT_TYPES = ["WEDDING", "DEBUT", "CORPORATE", "BIRTHDAY", "OTHER"] as const
const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"] as const

export const createBookingSchema = z.object({
  packageId: z.string().min(1, "A service package must be selected"),
  eventType: z.enum(EVENT_TYPES, {
    error: `Event type must be one of: ${EVENT_TYPES.join(", ")}`,
  }),
  eventDate: z
    .string()
    .min(1, "Event date is required")
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" })
    .refine((val) => new Date(val) > new Date(), {
      message: "Event date must be in the future",
    }),
  eventTime: z.string().optional(),
  venue: z.string().min(1, "Venue is required").max(200),
  guestCount: z
    .number({ error: "Guest count must be a number" })
    .int("Guest count must be a whole number")
    .min(1, "At least 1 guest is required")
    .max(10000),
  notes: z.string().max(1000).optional(),
})

export const updateBookingStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"] as const, {
    error: "Status must be CONFIRMED or CANCELLED",
  }),
  cancellationReason: z.string().max(500).optional(),
}).refine(
  (data) => data.status !== "CANCELLED" || !!data.cancellationReason,
  {
    message: "A cancellation reason is required when cancelling a booking",
    path: ["cancellationReason"],
  },
)

export const bookingFilterSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>
export type BookingFilterInput = z.infer<typeof bookingFilterSchema>
