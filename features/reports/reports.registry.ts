// features/reports/reports.registry.ts
//
// Single source of truth for the five reports. The GET routes and the
// export route are both driven from this table, so a report's role rules,
// query and CSV layout live in exactly one place.

import type { CsvColumn } from "@/lib/csv-export"
import { getAuditReport } from "./reports.audit.query"
import { getBookingReport } from "./reports.booking.query"
import { REPORT_LABELS, REPORT_ROLES, type ReportType } from "./reports.constants"
import { yesNo } from "./reports.export"
import { getPaymentReport } from "./reports.payment.query"
import type { ReportFilterInput } from "./reports.schema"
import type { Paging } from "./reports.shared"
import { getStaffReport } from "./reports.staff.query"
import type {
  AnyReport, AuditReport, BookingReport, PaymentReport, StaffReport, VendorReport,
} from "./reports.types"
import { getVendorReport } from "./reports.vendor.query"

export interface ExportTable {
  /** Suffix for the filename, e.g. "outstanding" → payments-outstanding-2026-09-19.csv */
  key:     string
  columns: CsvColumn[]
  rows:    Record<string, unknown>[]
}

export interface ReportDefinition {
  type:  ReportType
  label: string
  roles: ("ADMIN" | "COORDINATOR")[]
  run:   (filters: ReportFilterInput, paging: Paging) => Promise<AnyReport>
  /** Returns null when `table` isn't a valid export table for this report. */
  exportTable: (report: AnyReport, table?: string) => ExportTable | null
}

function define<R extends AnyReport>(def: {
  type:  ReportType
  run:   (filters: ReportFilterInput, paging: Paging) => Promise<R>
  tables: (report: R) => Record<string, ExportTable>
}): ReportDefinition {
  return {
    type:  def.type,
    label: REPORT_LABELS[def.type],
    roles: REPORT_ROLES[def.type],
    run:   def.run,
    exportTable: (report, table) => def.tables(report as R)[table ?? "main"] ?? null,
  }
}

// ── Bookings ─────────────────────────────────────────────────────

const bookingColumns: CsvColumn[] = [
  { key: "bookingId",          label: "Booking ID" },
  { key: "clientName",         label: "Client" },
  { key: "eventType",          label: "Event type" },
  { key: "eventDate",          label: "Event date" },
  { key: "venue",              label: "Venue" },
  { key: "guestCount",         label: "Guests" },
  { key: "packageName",        label: "Package" },
  { key: "status",             label: "Status" },
  { key: "rate",               label: "Rate" },
  { key: "agreedPrice",        label: "Agreed price (PHP)" },
  { key: "paymentPlan",        label: "Payment plan" },
  { key: "cancellationReason", label: "Cancellation reason" },
  { key: "createdAt",          label: "Created (UTC)" },
]

// ── Payments ─────────────────────────────────────────────────────

const paymentColumns: CsvColumn[] = [
  { key: "paymentId",        label: "Payment ID" },
  { key: "bookingId",        label: "Booking ID" },
  { key: "clientName",       label: "Client" },
  { key: "eventType",        label: "Event type" },
  { key: "eventDate",        label: "Event date" },
  { key: "paymentType",      label: "Payment type" },
  { key: "installmentOrder", label: "Installment #" },
  { key: "method",           label: "Method" },
  { key: "amount",           label: "Amount (PHP)" },
  { key: "proofType",        label: "Proof type" },
  { key: "referenceNumber",  label: "Reference number" },
  { key: "status",           label: "Status" },
  { key: "submittedAt",      label: "Submitted (UTC)" },
  { key: "reviewedByName",   label: "Reviewed by" },
  { key: "reviewedAt",       label: "Reviewed (UTC)" },
  { key: "verificationNote", label: "Staff note" },
]

const outstandingColumns: CsvColumn[] = [
  { key: "bookingId",    label: "Booking ID" },
  { key: "clientName",   label: "Client" },
  { key: "eventType",    label: "Event type" },
  { key: "eventDate",    label: "Event date" },
  { key: "paymentPlan",  label: "Payment plan" },
  { key: "agreedPrice",  label: "Agreed price (PHP)" },
  { key: "verifiedPaid", label: "Verified paid (PHP)" },
  { key: "outstanding",  label: "Outstanding (PHP)" },
  { key: "nextDueDate",  label: "Next due date" },
  { key: "overdue",      label: "Overdue" },
  { key: "daysOverdue",  label: "Days overdue" },
]

// ── Vendors ──────────────────────────────────────────────────────

const vendorColumns: CsvColumn[] = [
  { key: "assignmentId",    label: "Assignment ID" },
  { key: "bookingId",       label: "Booking ID" },
  { key: "eventType",       label: "Event type" },
  { key: "eventDate",       label: "Event date" },
  { key: "venue",           label: "Venue" },
  { key: "bookingStatus",   label: "Booking status" },
  { key: "vendorName",      label: "Vendor" },
  { key: "category",        label: "Category" },
  { key: "status",          label: "Assignment status" },
  { key: "contactedAt",     label: "Contacted (UTC)" },
  { key: "confirmedAt",     label: "Confirmed (UTC)" },
  { key: "quotationAmount", label: "Quotation (PHP)" },
  { key: "quotationNote",   label: "Quotation note" },
]

const gapColumns: CsvColumn[] = [
  { key: "bookingId",     label: "Booking ID" },
  { key: "clientName",    label: "Client" },
  { key: "eventType",     label: "Event type" },
  { key: "eventDate",     label: "Event date" },
  { key: "bookingStatus", label: "Booking status" },
  { key: "requested",     label: "Requested categories" },
  { key: "missing",       label: "Missing (no confirmed vendor)" },
]

// ── Staff ────────────────────────────────────────────────────────

const staffColumns: CsvColumn[] = [
  { key: "bookingId",      label: "Booking ID" },
  { key: "eventType",      label: "Event type" },
  { key: "eventDate",      label: "Event date" },
  { key: "venue",          label: "Venue" },
  { key: "bookingStatus",  label: "Booking status" },
  { key: "guestCount",     label: "Guests" },
  { key: "recommended",    label: "Recommended coordinators" },
  { key: "primaryCount",   label: "Assigned (primary)" },
  { key: "backupCount",    label: "Assigned (backup)" },
  { key: "compliance",     label: "Staffing level" },
  { key: "hasBackup",      label: "Has backup" },
  { key: "coordinators",   label: "Coordinators" },
  { key: "hasConflict",    label: "Coordinator conflict" },
]

const coordinatorColumns: CsvColumn[] = [
  { key: "name",          label: "Coordinator" },
  { key: "isActive",      label: "Active" },
  { key: "primaryCount",  label: "Primary assignments" },
  { key: "backupCount",   label: "Backup assignments" },
  { key: "conflictDates", label: "Conflicting dates" },
]

// ── Audit ────────────────────────────────────────────────────────

const auditColumns: CsvColumn[] = [
  { key: "sequence",     label: "Sequence #" },
  { key: "createdAt",    label: "Timestamp (UTC)" },
  { key: "userName",     label: "User" },
  { key: "userRole",     label: "Role" },
  { key: "action",       label: "Action" },
  { key: "module",       label: "Module" },
  { key: "description",  label: "Description" },
  { key: "status",       label: "Status" },
  { key: "hash",         label: "Entry hash (SHA-256)" },
  { key: "previousHash", label: "Previous hash" },
]

// ── The registry ─────────────────────────────────────────────────

export const REPORT_REGISTRY: Record<ReportType, ReportDefinition> = {
  bookings: define<BookingReport>({
    type: "bookings",
    run:  getBookingReport,
    tables: (r) => ({
      main: {
        key: "",
        columns: bookingColumns,
        rows: r.rows.map((b) => ({ ...b, rate: b.isProvincial ? "Provincial" : "Metro Manila" })),
      },
    }),
  }),

  payments: define<PaymentReport>({
    type: "payments",
    run:  getPaymentReport,
    tables: (r) => ({
      main: { key: "", columns: paymentColumns, rows: r.rows.map((p) => ({ ...p })) },
      outstanding: {
        key: "outstanding",
        columns: outstandingColumns,
        rows: r.outstanding.map((o) => ({ ...o, overdue: yesNo(o.isOverdue) })),
      },
    }),
  }),

  vendors: define<VendorReport>({
    type: "vendors",
    run:  getVendorReport,
    tables: (r) => ({
      main: { key: "", columns: vendorColumns, rows: r.rows.map((v) => ({ ...v })) },
      gaps: {
        key: "gaps",
        columns: gapColumns,
        rows: r.gaps.map((g) => ({ ...g, requested: g.requested.join("; "), missing: g.missing.join("; ") })),
      },
    }),
  }),

  staff: define<StaffReport>({
    type: "staff",
    run:  getStaffReport,
    tables: (r) => ({
      main: {
        key: "",
        columns: staffColumns,
        rows: r.rows.map((s) => ({
          ...s,
          recommended:  s.recommendedMin === s.recommendedMax ? `${s.recommendedMin}` : `${s.recommendedMin}-${s.recommendedMax}`,
          hasBackup:    yesNo(s.hasBackup),
          hasConflict:  yesNo(s.hasConflict),
          coordinators: s.coordinators.join("; "),
        })),
      },
      coordinators: {
        key: "coordinators",
        columns: coordinatorColumns,
        rows: r.coordinators.map((c) => ({ ...c, isActive: yesNo(c.isActive) })),
      },
    }),
  }),

  audit: define<AuditReport>({
    type: "audit",
    run:  getAuditReport,
    tables: (r) => ({
      main: {
        key: "",
        columns: auditColumns,
        rows: r.rows.map((e) => ({ ...e, userName: e.userName ?? "System", previousHash: e.previousHash ?? "GENESIS" })),
      },
    }),
  }),
}
