// features/bookings/bookings.constants.ts

export const bookingKeys = {
  all: ["bookings"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...bookingKeys.lists(), filters] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
  availability: (date: string) => [...bookingKeys.all, "availability", date] as const,
} as const

export const bookingRoutes = {
  bookings: "/bookings",
  booking: (id: string) => `/bookings/${id}`,
  availability: "/bookings/availability",
} as const

export const BOOKING_STATUS_LABELS = {
  PENDING:   "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
} as const

export const EVENT_TYPE_LABELS = {
  WEDDING:   "Wedding",
  DEBUT:     "Debut",
  CORPORATE: "Corporate Event",
  BIRTHDAY:  "Birthday",
  OTHER:     "Other",
} as const
