// features/bookings/bookings.schema.ts

import { z } from "zod"

const EVENT_TYPES      = ["WEDDING", "DEBUT", "CORPORATE", "BIRTHDAY", "OTHER"] as const
const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "CANCELLATION_REQUESTED"] as const
const PAYMENT_PLANS    = ["FULL", "INSTALLMENT"] as const
const PH_MOBILE_REGEX  = /^(\+63|0)9\d{9}$/

export const createBookingSchema = z.object({
  packageId:             z.string().min(1, "A service package must be selected"),
  eventType:             z.enum(EVENT_TYPES, { error: `Must be one of: ${EVENT_TYPES.join(", ")}` }),
  eventDate:             z.string().min(1, "Event date is required")
    .refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date format" })
    .refine((v) => new Date(v) > new Date(), { message: "Event date must be in the future" }),
  eventTime:             z.string().optional(),
  venue:                 z.string().min(1, "Venue is required").max(200),
  venueLatitude:         z.number().optional(),
  venueLongitude:        z.number().optional(),
  venueFormattedAddress: z.string().max(300).optional(),
  guestCount:            z.number({ error: "Guest count must be a number" }).int().min(1).max(10000),
  clientPhone:           z.string().min(1, "Mobile number is required")
    .regex(PH_MOBILE_REGEX, "Enter a valid PH mobile number (e.g. 09171234567)"),
  notes:                 z.string().max(1000).optional(),
  packageCustomizations: z.array(z.string().min(1)).optional(),
  isProvincial:          z.boolean().optional(),
})

export const updateBookingSchema = z.object({
  packageId:             z.string().min(1).optional(),
  eventType:             z.enum(EVENT_TYPES).optional(),
  eventDate:             z.string()
    .refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date format" })
    .refine((v) => new Date(v) > new Date(), { message: "Event date must be in the future" })
    .optional(),
  eventTime:             z.string().optional(),
  venue:                 z.string().min(1).max(200).optional(),
  venueLatitude:         z.number().optional(),
  venueLongitude:        z.number().optional(),
  venueFormattedAddress: z.string().max(300).optional(),
  guestCount:            z.number().int().min(1).max(10000).optional(),
  clientPhone:           z.string().regex(PH_MOBILE_REGEX, "Enter a valid PH mobile number").optional(),
  notes:                 z.string().max(1000).optional(),
  packageCustomizations: z.array(z.string().min(1)).optional(),
  isProvincial:          z.boolean().optional(),
})

export const updateBookingStatusSchema = z.object({
  status:             z.enum(["CONFIRMED", "CANCELLED"] as const),
  cancellationReason: z.string().max(500).optional(),
}).refine(
  (d) => d.status !== "CANCELLED" || !!d.cancellationReason,
  { message: "A cancellation reason is required", path: ["cancellationReason"] },
)

export const setContractTermsSchema = z.object({
  agreedPrice:        z.number().positive().multipleOf(0.01).optional(),
  paymentPlan:        z.enum(PAYMENT_PLANS).optional(),
  depositAmount:      z.number().positive().multipleOf(0.01).optional(),
  depositDueDate:     z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" }).optional(),
  // NEW: only relevant for FULL plan — when the remaining balance is due
  fullPaymentDueDate: z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" }).optional(),
  staffNote:          z.string().max(500).optional(),
})

export const cancelRequestSchema = z.object({
  reason: z.string().min(10, "Please provide at least 10 characters").max(500),
})

export const bookingFilterSchema = z.object({
  status:    z.enum(BOOKING_STATUSES).optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
  from:      z.string().optional(),
  to:        z.string().optional(),
})

export type CreateBookingInput       = z.infer<typeof createBookingSchema>
export type UpdateBookingInput       = z.infer<typeof updateBookingSchema>
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>
export type SetContractTermsInput    = z.infer<typeof setContractTermsSchema>
export type CancelRequestInput       = z.infer<typeof cancelRequestSchema>
export type BookingFilterInput       = z.infer<typeof bookingFilterSchema>
