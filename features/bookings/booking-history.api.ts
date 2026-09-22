// features/bookings/booking-history.api.ts
"use client"

import api from "@/lib/axios"
import type { BookingHistoryEvent } from "./booking-history.types"

export async function fetchBookingHistory(bookingId: string): Promise<BookingHistoryEvent[]> {
  const { data } = await api.get<BookingHistoryEvent[]>(`/bookings/${bookingId}/history`)
  return data
}
