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
  contractTerms: (id: string) => `/bookings/${id}/contract-terms`,
  cancelRequest: (id: string) => `/bookings/${id}/cancel-request`,
  availability:  "/bookings/availability",
} as const

export const BOOKING_STATUS_LABELS = {
  PENDING:                "Pending",
  CONFIRMED:              "Confirmed",
  CANCELLED:              "Cancelled",
  CANCELLATION_REQUESTED: "Cancellation Requested",
} as const

export const PAYMENT_PLAN_LABELS = {
  FULL:        "Full Payment",
  INSTALLMENT: "Installment Plan",
} as const

/**
 * Event types that can be booked and offered as packages. The thesis scope is Wedding and Debut only;
 * CORPORATE, BIRTHDAY and OTHER stay in the database enum (old records still display) but cannot be chosen.
 * Add a value back here to re-enable it everywhere (forms, public catalog, API validation).
 */
export const ACTIVE_EVENT_TYPES = ["WEDDING", "DEBUT"] as const
export type ActiveEventType = (typeof ACTIVE_EVENT_TYPES)[number]
export const isActiveEventType = (t: string): t is ActiveEventType =>
  (ACTIVE_EVENT_TYPES as readonly string[]).includes(t)

/**
 * Location-based (provincial) pricing — a thesis LIMITATION in this version (see Delimitations).
 * When false: the public catalog shows one price, booking forms hide the provincial badges, and the API
 * ignores `isProvincial` (bookings are always priced at the standard rate). Set to true to bring it back.
 */
export const PROVINCIAL_PRICING_ENABLED = false

export const EVENT_TYPE_LABELS = {
  WEDDING:   "Wedding",
  DEBUT:     "Debut",
  CORPORATE: "Corporate Event",
  BIRTHDAY:  "Birthday",
  OTHER:     "Other",
} as const

export const METRO_MANILA_KEYWORDS = [
  "manila", "quezon city", "makati", "taguig", "pasig", "mandaluyong",
  "marikina", "caloocan", "las piñas", "las pinas", "muntinlupa",
  "parañaque", "paranaque", "pasay", "pateros", "san juan", "valenzuela",
  "malabon", "navotas", "ncr", "metro manila",
] as const

export function detectIsMetroManila(venueText: string): boolean {
  const lower = venueText.toLowerCase()
  return METRO_MANILA_KEYWORDS.some((kw) => lower.includes(kw))
}
