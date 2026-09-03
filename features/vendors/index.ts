// features/vendors/index.ts

export {
  vendorKeys,
  bookingVendorKeys,
  vendorRoutes,
  VENDOR_CATEGORY_LABELS,
  VENDOR_CATEGORY_ICONS,
  CONTACT_CHANNEL_OPTIONS,
} from "./vendors.constants"

export {
  createVendorSchema,
  updateVendorSchema,
  assignVendorSchema,
  updateBookingVendorSchema,
  vendorFilterSchema,
} from "./vendors.schema"
export type {
  CreateVendorInput,
  UpdateVendorInput,
  AssignVendorInput,
  UpdateBookingVendorInput,
  VendorFilterInput,
  VendorCategory,
} from "./vendors.schema"

export type {
  Vendor,
  VendorWithAssignmentCount,
  BookingVendor,
  VendorCoverageCheck,
} from "./vendors.types"

export {
  fetchVendors, fetchVendor, createVendor, updateVendor, deleteVendor,
  fetchBookingVendors, fetchVendorCoverage, assignVendor,
  updateBookingVendor, removeVendor,
} from "./vendors.api"

export {
  useVendors, useVendor, useBookingVendors, useVendorCoverage,
  useCreateVendor, useUpdateVendor, useDeleteVendor,
  useAssignVendor, useUpdateBookingVendor, useRemoveVendor,
} from "./vendors.hooks"
