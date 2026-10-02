// features/reports/reports.options.ts
//
// Dropdown options for the report filter bar. Client-safe.

import { EVENT_TYPE_LABELS, humanize } from "./reports.format"
import { ACTIVE_EVENT_TYPES } from "@/features/bookings/bookings.constants"
import type { ReportType } from "./reports.constants"
import type { ReportFilterFormValues } from "./reports.schema"

export interface Option { value: string; label: string }

const opts = (values: string[], labels?: Record<string, string>): Option[] =>
  values.map((v) => ({ value: v, label: labels?.[v] ?? humanize(v) }))

export const BOOKING_STATUS_OPTIONS = opts(["PENDING", "CONFIRMED", "CANCELLATION_REQUESTED", "CANCELLED"])
// SCOPE: Wedding and Debut only. The report API still accepts the old values so historical data stays queryable.
export const EVENT_TYPE_OPTIONS     = opts([...ACTIVE_EVENT_TYPES], EVENT_TYPE_LABELS)
export const PAYMENT_STATUS_OPTIONS = opts(["SUBMITTED", "VERIFIED", "FLAGGED", "PENDING"])
export const PAYMENT_TYPE_OPTIONS   = opts(["DEPOSIT", "INSTALLMENT", "FULL_BALANCE"])
export const PAYMENT_METHOD_OPTIONS = opts(["GCASH", "MAYA", "BANK_TRANSFER", "CHEQUE", "CASH"], {
  GCASH: "GCash", MAYA: "Maya", BANK_TRANSFER: "Bank transfer", CHEQUE: "Cheque", CASH: "Cash",
})
export const COMPLIANCE_OPTIONS     = opts(["COMPLIANT", "UNDERSTAFFED", "OVERSTAFFED"])
export const AUDIT_STATUS_OPTIONS   = opts(["SUCCESS", "FAILURE"])

/** Which filter fields each report shows, in display order. */
export const REPORT_FILTER_FIELDS: Record<ReportType, (keyof ReportFilterFormValues)[]> = {
  bookings: ["bookingStatus", "eventType"],
  payments: ["paymentStatus", "paymentType", "paymentMethod", "eventType"],
  vendors:  ["vendorCategory", "bookingStatus", "eventType"],
  staff:    ["compliance", "bookingStatus", "eventType"],
  audit:    ["userId", "module", "action", "status"],
}

/** What the from/to dates mean for each report — shown as helper text. */
export const DATE_FILTER_HINT: Record<ReportType, string> = {
  bookings: "Event date",
  payments: "Submission date",
  vendors:  "Event date",
  staff:    "Event date",
  audit:    "Log date",
}
