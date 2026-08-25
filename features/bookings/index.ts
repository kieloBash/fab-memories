// features/bookings/index.ts

export {
  bookingKeys,
  bookingRoutes,
  BOOKING_STATUS_LABELS,
  EVENT_TYPE_LABELS,
} from "./bookings.constants"

export {
  createBookingSchema,
  updateBookingStatusSchema,
  bookingFilterSchema,
} from "./bookings.schema"
export type {
  CreateBookingInput,
  UpdateBookingStatusInput,
  BookingFilterInput,
} from "./bookings.schema"

export type {
  Booking,
  BookingWithRelations,
  BookingClient,
  BookingConfirmedBy,
  AvailabilityResult,
} from "./bookings.types"

export {
  fetchBookings,
  fetchBooking,
  createBooking,
  updateBookingStatus,
  checkAvailability,
} from "./bookings.api"

export {
  useBookings,
  useBooking,
  useAvailability,
  useCreateBooking,
  useUpdateBookingStatus,
} from "./bookings.hooks"

// Server-only — import directly in route handlers
// export { ... } from "./bookings.query"
