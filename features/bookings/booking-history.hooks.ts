// features/bookings/booking-history.hooks.ts
"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchBookingHistory } from "./booking-history.api"

export function useBookingHistory(bookingId: string) {
  return useQuery({
    queryKey: ["bookings", bookingId, "history"] as const,
    queryFn: () => fetchBookingHistory(bookingId),
    enabled: !!bookingId,
  })
}
