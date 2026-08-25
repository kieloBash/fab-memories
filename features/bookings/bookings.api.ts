// features/bookings/bookings.api.ts
"use client"

import api from "@/lib/axios"
import { bookingRoutes } from "./bookings.constants"
import type { AvailabilityResult, Booking, BookingWithRelations } from "./bookings.types"
import type {
  BookingFilterInput,
  CreateBookingInput,
  UpdateBookingStatusInput,
} from "./bookings.schema"

export async function fetchBookings(
  filters?: BookingFilterInput,
): Promise<BookingWithRelations[]> {
  const { data } = await api.get<BookingWithRelations[]>(bookingRoutes.bookings, {
    params: filters,
  })
  return data
}

export async function fetchBooking(id: string): Promise<BookingWithRelations> {
  const { data } = await api.get<BookingWithRelations>(bookingRoutes.booking(id))
  return data
}

export async function createBooking(input: CreateBookingInput): Promise<BookingWithRelations> {
  const { data } = await api.post<BookingWithRelations>(bookingRoutes.bookings, input)
  return data
}

export async function updateBookingStatus(
  id: string,
  input: UpdateBookingStatusInput,
): Promise<BookingWithRelations> {
  const { data } = await api.patch<BookingWithRelations>(bookingRoutes.booking(id), input)
  return data
}

export async function checkAvailability(date: string): Promise<AvailabilityResult> {
  const { data } = await api.get<AvailabilityResult>(bookingRoutes.availability, {
    params: { date },
  })
  return data
}
