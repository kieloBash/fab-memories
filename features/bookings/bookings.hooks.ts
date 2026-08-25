// features/bookings/bookings.hooks.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/axios"
import { bookingKeys } from "./bookings.constants"
import {
  checkAvailability,
  createBooking,
  fetchBooking,
  fetchBookings,
  updateBookingStatus,
} from "./bookings.api"
import type { BookingFilterInput, CreateBookingInput, UpdateBookingStatusInput } from "./bookings.schema"

// ── Queries ───────────────────────────────────────────────────

export function useBookings(filters?: BookingFilterInput) {
  return useQuery({
    queryKey: bookingKeys.list(filters ?? {}),
    queryFn: () => fetchBookings(filters),
  })
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => fetchBooking(id),
    enabled: !!id,
  })
}

export function useAvailability(date: string) {
  return useQuery({
    queryKey: bookingKeys.availability(date),
    queryFn: () => checkAvailability(date),
    enabled: !!date,
    staleTime: 30_000, // recheck availability every 30s max
  })
}

// ── Mutations ─────────────────────────────────────────────────

export function useCreateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateBookingInput) => createBooking(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
      toast.success("Booking request submitted successfully")
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBookingStatusInput }) =>
      updateBookingStatus(id, input),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) })

      const message =
        data.status === "CONFIRMED"
          ? "Booking confirmed successfully"
          : "Booking has been cancelled"
      toast.success(message)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}
