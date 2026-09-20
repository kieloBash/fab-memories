// features/reports/reports.schema.ts
//
// One schema, two uses: validates the filter bar on the client (batch 2)
// AND the query string in every /api/reports/* route handler.

import { z } from "zod"
import { REPORT_PAGE_SIZE_DEFAULT, REPORT_PAGE_SIZE_MAX } from "./reports.constants"

const BOOKING_STATUSES  = ["PENDING", "CONFIRMED", "CANCELLED", "CANCELLATION_REQUESTED"] as const
const EVENT_TYPES       = ["WEDDING", "DEBUT", "CORPORATE", "BIRTHDAY", "OTHER"] as const
const PAYMENT_STATUSES  = ["PENDING", "SUBMITTED", "VERIFIED", "FLAGGED"] as const
const PAYMENT_TYPES     = ["DEPOSIT", "INSTALLMENT", "FULL_BALANCE"] as const
const PAYMENT_METHODS   = ["GCASH", "MAYA", "BANK_TRANSFER", "CHEQUE", "CASH"] as const
const VENDOR_CATEGORIES = [
  "CATERING", "PHOTOGRAPHY", "VIDEOGRAPHY", "FLORALS", "DECORATION",
  "SOUNDS_LIGHTING", "VENUE", "HAIR_MAKEUP", "ENTERTAINMENT", "TRANSPORTATION", "OTHER",
] as const
const COMPLIANCE        = ["COMPLIANT", "UNDERSTAFFED", "OVERSTAFFED"] as const
const AUDIT_MODULES     = [
  "AUTH", "USER_MANAGEMENT", "BOOKING", "PAYMENT", "VENDOR", "STAFF_SCHEDULE", "DOCUMENT", "REPORT",
] as const
const AUDIT_ACTIONS     = [
  "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "VERIFY", "CONFIRM", "DECLINE", "EXPORT", "VIEW",
] as const
const AUDIT_STATUSES    = ["SUCCESS", "FAILURE"] as const

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")

/**
 * Superset of every report's filters. Each report reads only the fields
 * that apply to it and ignores the rest.
 *
 *   from / to  → bookings, vendors, staff : event date
 *                payments                 : submission date (Manila day)
 *                audit                    : log timestamp   (Manila day)
 */
export const reportFilterSchema = z
  .object({
    from: ymd.optional(),
    to:   ymd.optional(),

    // bookings / vendors / staff / payments (via booking)
    bookingStatus: z.enum(BOOKING_STATUSES).optional(),
    eventType:     z.enum(EVENT_TYPES).optional(),

    // payments
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
    paymentType:   z.enum(PAYMENT_TYPES).optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),

    // vendors
    vendorCategory: z.enum(VENDOR_CATEGORIES).optional(),

    // staff
    compliance: z.enum(COMPLIANCE).optional(),

    // audit
    userId: z.string().min(1).max(64).optional(),
    module: z.enum(AUDIT_MODULES).optional(),
    action: z.enum(AUDIT_ACTIONS).optional(),
    status: z.enum(AUDIT_STATUSES).optional(),
    search: z.string().trim().min(1).max(100).optional(),

    // row paging (summary figures always cover the full filtered set)
    page:     z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(REPORT_PAGE_SIZE_MAX).default(REPORT_PAGE_SIZE_DEFAULT),
  })
  .refine((d) => !d.from || !d.to || d.from <= d.to, {
    message: "The 'from' date must not be after the 'to' date",
    path: ["to"],
  })

/** Parsed/validated filters (defaults applied) — what queries receive. */
export type ReportFilterInput = z.infer<typeof reportFilterSchema>
/** Raw form values (before defaults) — what the filter bar edits. */
export type ReportFilterFormValues = z.input<typeof reportFilterSchema>

/** Query for the CSV export endpoint. */
export const reportExportQuerySchema = z.object({
  format: z.enum(["csv"]).default("csv"),
  /** Which table of the report to export (e.g. "outstanding"); defaults to the main table. */
  table: z.string().regex(/^[a-z-]{1,30}$/).optional(),
})

/**
 * Turns URLSearchParams into a filter object, treating empty strings as
 * "not provided" (HTML selects submit "" for "All").
 */
export function parseReportFilters(searchParams: URLSearchParams) {
  const raw: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) {
    if (value !== "") raw[key] = value
  }
  return reportFilterSchema.safeParse(raw)
}
