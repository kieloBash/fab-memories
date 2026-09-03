// features/vendors/vendors.hooks.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/axios"
import { bookingVendorKeys, vendorKeys } from "./vendors.constants"
import {
  assignVendor,
  createVendor,
  deleteVendor,
  fetchBookingVendors,
  fetchVendor,
  fetchVendorCoverage,
  fetchVendors,
  removeVendor,
  updateBookingVendor,
  updateVendor,
} from "./vendors.api"
import type {
  AssignVendorInput,
  CreateVendorInput,
  UpdateBookingVendorInput,
  UpdateVendorInput,
  VendorFilterInput,
} from "./vendors.schema"

// ── Vendor queries ────────────────────────────────────────────

export function useVendors(filters?: VendorFilterInput) {
  return useQuery({
    queryKey: vendorKeys.list(filters ?? {}),
    queryFn:  () => fetchVendors(filters),
  })
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn:  () => fetchVendor(id),
    enabled:  !!id,
  })
}

export function useBookingVendors(bookingId: string) {
  return useQuery({
    queryKey: bookingVendorKeys.byBooking(bookingId),
    queryFn:  () => fetchBookingVendors(bookingId),
    enabled:  !!bookingId,
  })
}

export function useVendorCoverage(bookingId: string) {
  return useQuery({
    queryKey: [...bookingVendorKeys.byBooking(bookingId), "coverage"],
    queryFn:  () => fetchVendorCoverage(bookingId),
    enabled:  !!bookingId,
  })
}

// ── Vendor mutations ──────────────────────────────────────────

export function useCreateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateVendorInput) => createVendor(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
      toast.success("Vendor added to directory")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useUpdateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateVendorInput }) =>
      updateVendor(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(id) })
      toast.success("Vendor updated")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useDeleteVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
      toast.success("Vendor removed from directory")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

// ── Booking vendor mutations ──────────────────────────────────

export function useAssignVendor(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AssignVendorInput) => assignVendor(bookingId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingVendorKeys.byBooking(bookingId) })
      toast.success("Vendor assigned to booking")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useUpdateBookingVendor(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId, input }: { vendorId: string; input: UpdateBookingVendorInput }) =>
      updateBookingVendor(bookingId, vendorId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingVendorKeys.byBooking(bookingId) })
      toast.success("Vendor status updated")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useRemoveVendor(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vendorId: string) => removeVendor(bookingId, vendorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingVendorKeys.byBooking(bookingId) })
      toast.success("Vendor removed from booking")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}
