// features/bookings/bookings.hooks.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/axios"
import { bookingKeys } from "./bookings.constants"
import {
  checkAvailability,
  createBooking,
  deleteBooking,
  fetchBooking,
  fetchBookings,
  requestBookingCancellation,
  setContractTerms,
  updateBooking,
  updateBookingStatus,
} from "./bookings.api"
import type {
  BookingFilterInput,
  CancelRequestInput,
  CreateBookingInput,
  SetContractTermsInput,
  UpdateBookingInput,
  UpdateBookingStatusInput,
} from "./bookings.schema"

// ── Queries ───────────────────────────────────────────────────

export function useBookings(filters?: BookingFilterInput) {
  return useQuery({
    queryKey: bookingKeys.list(filters ?? {}),
    queryFn:  () => fetchBookings(filters),
  })
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn:  () => fetchBooking(id),
    enabled:  !!id,
  })
}

export function useAvailability(date: string) {
  return useQuery({
    queryKey: bookingKeys.availability(date),
    queryFn:  () => checkAvailability(date),
    enabled:  !!date,
    staleTime: 30_000,
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
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useUpdateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBookingInput }) =>
      updateBooking(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) })
      toast.success("Booking updated successfully")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useDeleteBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
      toast.success("Booking request withdrawn")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
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
      toast.success(
        data.status === "CONFIRMED" ? "Booking confirmed" : "Booking cancelled",
      )
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useSetContractTerms() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SetContractTermsInput }) =>
      setContractTerms(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) })
      toast.success("Contract terms saved")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useRequestCancellation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CancelRequestInput }) =>
      requestBookingCancellation(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) })
      toast.success("Cancellation request submitted — staff will review shortly")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}
