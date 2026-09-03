// features/vendors/vendors.constants.ts

export const vendorKeys = {
  all:     ["vendors"] as const,
  lists:   () => [...vendorKeys.all, "list"] as const,
  list:    (filters: Record<string, unknown>) => [...vendorKeys.lists(), filters] as const,
  details: () => [...vendorKeys.all, "detail"] as const,
  detail:  (id: string) => [...vendorKeys.details(), id] as const,
} as const

export const bookingVendorKeys = {
  byBooking: (bookingId: string) => ["booking-vendors", bookingId] as const,
} as const

export const vendorRoutes = {
  vendors:       "/vendors",
  vendor:        (id: string) => `/vendors/${id}`,
  bookingVendors: (bookingId: string) => `/bookings/${bookingId}/vendors`,
  bookingVendor:  (bookingId: string, vendorId: string) =>
    `/bookings/${bookingId}/vendors/${vendorId}`,
} as const

export const VENDOR_CATEGORY_LABELS = {
  CATERING:        "Catering",
  PHOTOGRAPHY:     "Photography",
  VIDEOGRAPHY:     "Videography",
  FLORALS:         "Florals",
  DECORATION:      "Decoration",
  SOUNDS_LIGHTING: "Sounds & Lighting",
  VENUE:           "Venue",
  HAIR_MAKEUP:     "Hair & Makeup",
  ENTERTAINMENT:   "Entertainment",
  TRANSPORTATION:  "Transportation",
  OTHER:           "Other",
} as const

export const VENDOR_CATEGORY_ICONS: Record<string, string> = {
  CATERING:        "🍽️",
  PHOTOGRAPHY:     "📷",
  VIDEOGRAPHY:     "🎥",
  FLORALS:         "🌸",
  DECORATION:      "✨",
  SOUNDS_LIGHTING: "🎵",
  VENUE:           "🏛️",
  HAIR_MAKEUP:     "💄",
  ENTERTAINMENT:   "🎭",
  TRANSPORTATION:  "🚗",
  OTHER:           "📦",
}

export const CONTACT_CHANNEL_OPTIONS = [
  "Viber",
  "FB Messenger",
  "SMS",
  "Email",
  "WhatsApp",
  "Phone Call",
] as const
