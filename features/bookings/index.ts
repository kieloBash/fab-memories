// features/bookings/index.ts

export {
  BOOKING_STATUS_LABELS, bookingKeys,
  bookingRoutes, EVENT_TYPE_LABELS,
  PAYMENT_PLAN_LABELS, ACTIVE_EVENT_TYPES, isActiveEventType, PROVINCIAL_PRICING_ENABLED
} from "./bookings.constants"
export type { ActiveEventType } from "./bookings.constants"

export {
  bookingFilterSchema, createBookingSchema,
  updateBookingStatusSchema
} from "./bookings.schema"
export type {
  BookingFilterInput, CreateBookingInput,
  UpdateBookingStatusInput
} from "./bookings.schema"

export type {
  AvailabilityResult, Booking, BookingClient,
  BookingConfirmedBy, BookingWithRelations
} from "./bookings.types"

export {
  checkAvailability, createBooking, fetchBooking, fetchBookings, updateBookingStatus
} from "./bookings.api"

export {
  useAvailability, useBooking, useBookings, useCreateBooking, useUpdateBooking, useUpdateBookingStatus
} from "./bookings.hooks"

// Server-only — import directly in route handlers
// export { ... } from "./bookings.query"
