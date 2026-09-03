// features/vendors/vendors.api.ts
"use client"

import api from "@/lib/axios"
import { vendorRoutes } from "./vendors.constants"
import type { BookingVendor, Vendor, VendorCoverageCheck, VendorWithAssignmentCount } from "./vendors.types"
import type {
  AssignVendorInput,
  CreateVendorInput,
  UpdateBookingVendorInput,
  UpdateVendorInput,
  VendorFilterInput,
} from "./vendors.schema"

// ── Vendor CRUD ───────────────────────────────────────────────

export async function fetchVendors(
  filters?: VendorFilterInput,
): Promise<VendorWithAssignmentCount[]> {
  const { data } = await api.get<VendorWithAssignmentCount[]>(vendorRoutes.vendors, {
    params: filters,
  })
  return data
}

export async function fetchVendor(id: string): Promise<VendorWithAssignmentCount> {
  const { data } = await api.get<VendorWithAssignmentCount>(vendorRoutes.vendor(id))
  return data
}

export async function createVendor(input: CreateVendorInput): Promise<Vendor> {
  const { data } = await api.post<Vendor>(vendorRoutes.vendors, input)
  return data
}

export async function updateVendor(id: string, input: UpdateVendorInput): Promise<Vendor> {
  const { data } = await api.patch<Vendor>(vendorRoutes.vendor(id), input)
  return data
}

export async function deleteVendor(id: string): Promise<void> {
  await api.delete(vendorRoutes.vendor(id))
}

// ── Booking vendor assignments ────────────────────────────────

export async function fetchBookingVendors(bookingId: string): Promise<BookingVendor[]> {
  const { data } = await api.get<BookingVendor[]>(vendorRoutes.bookingVendors(bookingId))
  return data
}

export async function fetchVendorCoverage(bookingId: string): Promise<VendorCoverageCheck> {
  const { data } = await api.get<VendorCoverageCheck>(
    `${vendorRoutes.bookingVendors(bookingId)}/coverage`,
  )
  return data
}

export async function assignVendor(
  bookingId: string,
  input: AssignVendorInput,
): Promise<BookingVendor> {
  const { data } = await api.post<BookingVendor>(vendorRoutes.bookingVendors(bookingId), input)
  return data
}

export async function updateBookingVendor(
  bookingId: string,
  vendorId: string,
  input: UpdateBookingVendorInput,
): Promise<BookingVendor> {
  const { data } = await api.patch<BookingVendor>(
    vendorRoutes.bookingVendor(bookingId, vendorId),
    input,
  )
  return data
}

export async function removeVendor(bookingId: string, vendorId: string): Promise<void> {
  await api.delete(vendorRoutes.bookingVendor(bookingId, vendorId))
}
