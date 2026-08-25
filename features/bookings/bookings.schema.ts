// features/bookings/bookings.schema.ts

import { z } from "zod"

const EVENT_TYPES = ["WEDDING", "DEBUT", "CORPORATE", "BIRTHDAY", "OTHER"] as const
const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "CANCELLATION_REQUESTED"] as const

export const createBookingSchema = z.object({
  packageId:  z.string().min(1, "A service package must be selected"),
  eventType:  z.enum(EVENT_TYPES, {
    error: `Event type must be one of: ${EVENT_TYPES.join(", ")}`,
  }),
  eventDate: z
    .string()
    .min(1, "Event date is required")
    .refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date format" })
    .refine((v) => new Date(v) > new Date(), { message: "Event date must be in the future" }),
  eventTime: z.string().optional(),

  // Venue — either free text or enriched from Google Places
  venue:                z.string().min(1, "Venue is required").max(200),
  venueLatitude:        z.number().optional(),
  venueLongitude:       z.number().optional(),
  venueFormattedAddress: z.string().max(300).optional(),

  guestCount: z
    .number({ error: "Guest count must be a number" })
    .int("Guest count must be a whole number")
    .min(1, "At least 1 guest is required")
    .max(10000),

  notes:                z.string().max(1000).optional(),
  packageCustomizations: z.array(z.string().min(1)).optional(),

  // Location type for pricing — derived from map pin or manual selection
  isProvincial: z.boolean().optional(),
})

// Client can edit a PENDING booking (fields subset)
export const updateBookingSchema = z.object({
  packageId:   z.string().min(1).optional(),
  eventType:   z.enum(EVENT_TYPES).optional(),
  eventDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date format" })
    .refine((v) => new Date(v) > new Date(), { message: "Event date must be in the future" })
    .optional(),
  eventTime:   z.string().optional(),

  venue:                z.string().min(1).max(200).optional(),
  venueLatitude:        z.number().optional(),
  venueLongitude:       z.number().optional(),
  venueFormattedAddress: z.string().max(300).optional(),

  guestCount:           z.number().int().min(1).max(10000).optional(),
  notes:                z.string().max(1000).optional(),
  packageCustomizations: z.array(z.string().min(1)).optional(),
  isProvincial:         z.boolean().optional(),
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

// Client requesting cancellation of a CONFIRMED booking
export const cancelRequestSchema = z.object({
  reason: z.string().min(10, "Please provide at least 10 characters").max(500),
})

export const bookingFilterSchema = z.object({
  status:    z.enum(BOOKING_STATUSES).optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
  from:      z.string().optional(),
  to:        z.string().optional(),
})

export type CreateBookingInput      = z.infer<typeof createBookingSchema>
export type UpdateBookingInput      = z.infer<typeof updateBookingSchema>
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>
export type CancelRequestInput      = z.infer<typeof cancelRequestSchema>
export type BookingFilterInput      = z.infer<typeof bookingFilterSchema>
