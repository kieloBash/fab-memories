// features/bookings/bookings.constants.ts

export const bookingKeys = {
  all:          ["bookings"] as const,
  lists:        () => [...bookingKeys.all, "list"] as const,
  list:         (filters: Record<string, unknown>) => [...bookingKeys.lists(), filters] as const,
  details:      () => [...bookingKeys.all, "detail"] as const,
  detail:       (id: string) => [...bookingKeys.details(), id] as const,
  availability: (date: string) => [...bookingKeys.all, "availability", date] as const,
} as const

export const bookingRoutes = {
  bookings:      "/bookings",
  booking:       (id: string) => `/bookings/${id}`,
  cancelRequest: (id: string) => `/bookings/${id}/cancel-request`,
  availability:  "/bookings/availability",
} as const

export const BOOKING_STATUS_LABELS = {
  PENDING:                "Pending",
  CONFIRMED:              "Confirmed",
  CANCELLED:              "Cancelled",
  CANCELLATION_REQUESTED: "Cancellation Requested",
} as const

export const EVENT_TYPE_LABELS = {
  WEDDING:   "Wedding",
  DEBUT:     "Debut",
  CORPORATE: "Corporate Event",
  BIRTHDAY:  "Birthday",
  OTHER:     "Other",
} as const

// Metro Manila area codes / keywords for auto-detecting provincial vs. metro
export const METRO_MANILA_KEYWORDS = [
  "manila",
  "quezon city",
  "makati",
  "taguig",
  "pasig",
  "mandaluyong",
  "marikina",
  "caloocan",
  "las piñas",
  "las pinas",
  "muntinlupa",
  "parañaque",
  "paranaque",
  "pasay",
  "pateros",
  "san juan",
  "valenzuela",
  "malabon",
  "navotas",
  "ncr",
  "metro manila",
] as const

/**
 * Simple heuristic — returns true if the venue text matches a Metro Manila keyword.
 * Used as a fallback when no map coordinates are available.
 */
export function detectIsMetroManila(venueText: string): boolean {
  const lower = venueText.toLowerCase()
  return METRO_MANILA_KEYWORDS.some((kw) => lower.includes(kw))
}
