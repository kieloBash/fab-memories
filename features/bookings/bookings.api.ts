// features/bookings/bookings.api.ts
"use client"

import api from "@/lib/axios"
import { bookingRoutes } from "./bookings.constants"
import type { AvailabilityResult, BookingWithRelations } from "./bookings.types"
import type {
  BookingFilterInput,
  CancelRequestInput,
  CreateBookingInput,
  SetContractTermsInput,
  UpdateBookingInput,
  UpdateBookingStatusInput,
} from "./bookings.schema"

export async function fetchBookings(filters?: BookingFilterInput): Promise<BookingWithRelations[]> {
  const { data } = await api.get<BookingWithRelations[]>(bookingRoutes.bookings, { params: filters })
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

export async function updateBooking(id: string, input: UpdateBookingInput): Promise<BookingWithRelations> {
  const { data } = await api.patch<BookingWithRelations>(bookingRoutes.booking(id), input)
  return data
}

export async function deleteBooking(id: string): Promise<void> {
  await api.delete(bookingRoutes.booking(id))
}

export async function updateBookingStatus(id: string, input: UpdateBookingStatusInput): Promise<BookingWithRelations> {
  const { data } = await api.patch<BookingWithRelations>(bookingRoutes.booking(id), input)
  return data
}

export async function setContractTerms(id: string, input: SetContractTermsInput): Promise<BookingWithRelations> {
  const { data } = await api.patch<BookingWithRelations>(bookingRoutes.contractTerms(id), input)
  return data
}

export async function requestBookingCancellation(id: string, input: CancelRequestInput): Promise<BookingWithRelations> {
  const { data } = await api.post<BookingWithRelations>(bookingRoutes.cancelRequest(id), input)
  return data
}

export async function checkAvailability(date: string): Promise<AvailabilityResult> {
  const { data } = await api.get<AvailabilityResult>(bookingRoutes.availability, { params: { date } })
  return data
}
