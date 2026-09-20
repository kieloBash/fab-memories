// features/reports/reports.types.ts
//
// Conventions used in every report payload:
//   • date-only columns (eventDate, dueDate)  → "YYYY-MM-DD" strings
//   • timestamps (submittedAt, createdAt …)   → ISO-8601 UTC strings
//   • money                                   → JS numbers in PHP (Decimal → Number)

import type { ChainIntegrityResult } from "@/features/audit/audit.types"
import type { ReportFilterInput } from "./reports.schema"

// ─────────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────────

export interface ReportMeta {
  generatedAt: string
  /** Server-side time to build the report — evidence for NFR-05 (≤ 10 s). */
  durationMs:  number
  filters:     ReportFilterInput
  page:        number
  pageSize:    number
  totalRows:   number
  totalPages:  number
  /** True when an export hit EXPORT_ROW_LIMIT and rows were cut off. */
  truncated:   boolean
}

export interface CountItem { key: string; count: number }

// ─────────────────────────────────────────────────────────────────
// Risk engine
// ─────────────────────────────────────────────────────────────────

export type RiskSeverity = "HIGH" | "MEDIUM" | "LOW"

export type RiskKind =
  | "PROOF_UNVERIFIED"
  | "PAYMENT_FLAGGED"
  | "DEPOSIT_OVERDUE"
  | "INSTALLMENT_OVERDUE"
  | "FULL_BALANCE_OVERDUE"
  | "CONFIRMED_WITHOUT_DEPOSIT"
  | "UNDERSTAFFED_IMMINENT"
  | "VENDOR_GAP_IMMINENT"
  | "COORDINATOR_CONFLICT"
  | "CANCELLATION_PENDING"
  | "DOUBLE_CONFIRMED"
  | "DATE_CONTENTION"
  | "AUDIT_INTEGRITY"
  | "AUDIT_FAILURES"

export interface RiskIndicator {
  /** Stable key, e.g. "INSTALLMENT_OVERDUE:inst_abc". */
  id:           string
  kind:         RiskKind
  severity:     RiskSeverity
  title:        string
  detail:       string
  href:         string | null
  bookingId:    string | null
  paymentId:    string | null
  /** The date that makes this urgent (due date, submission time, event date) — ISO. */
  priorityDate: string
}

export interface RiskSummary {
  high:   number
  medium: number
  low:    number
  total:  number
}

export interface RiskReport {
  generatedAt: string
  summary:     RiskSummary
  byKind:      Partial<Record<RiskKind, number>>
  /** Rules that hit the per-rule row cap — show their counts as "N+" rather than exact. */
  cappedKinds: RiskKind[]
  items:       RiskIndicator[]
}

// ─────────────────────────────────────────────────────────────────
// Dashboard (FR-58)
// ─────────────────────────────────────────────────────────────────

/** One item in the Admin dashboard's merged "needs attention" list */
export interface NeedsAttentionItem {
  kind:        "CONTRACT_TERMS" | "PAYMENT_REVIEW" | "CANCELLATION_REQUEST"
  bookingId:   string
  paymentId?:  string
  label:       string   // e.g. client name or event type
  detail:      string   // short context line
  href:        string   // where clicking this item should navigate
  createdAt:   string   // for sorting, most recent first
}

/** One upcoming event row for the dashboard's "This week" list */
export interface UpcomingEventSummary {
  bookingId:  string
  eventType:  string
  eventDate:  string
  venue:      string
  status:     string
  clientName: string
}

/** One row of the dashboard's recent-activity feed (FR-58 "recent audit activity"). */
export interface RecentAuditItem {
  id:          string
  sequence:    number
  createdAt:   string
  userName:    string | null
  action:      string
  module:      string
  description: string
  status:      string
}

export interface AdminDashboardSummary {
  activeBookingsCount:      number  // CONFIRMED
  pendingRequestsCount:     number  // PENDING
  paymentsToVerifyCount:    number  // Payment.status = SUBMITTED
  upcomingThisWeekCount:    number  // eventDate within next 7 days, CONFIRMED or PENDING

  understaffedCount:        number  // upcoming events below FR-37 minimum
  vendorGapCount:           number  // upcoming events with an unmet requested vendor category

  needsAttention:           NeedsAttentionItem[]   // merged, most recent first, capped
  upcomingEvents:           UpcomingEventSummary[] // next 7 days, soonest first, capped

  // ── Added in Module 8 ──────────────────────────────────────────
  generatedAt:              string
  recentAudit:              RecentAuditItem[]      // latest business activity, capped
  risks:                    RiskIndicator[]        // top-priority risks, capped
  riskSummary:              RiskSummary            // totals across ALL risks, not just the capped list
}

// ─────────────────────────────────────────────────────────────────
// Booking report (FR-52)
// ─────────────────────────────────────────────────────────────────

export interface BookingReportRow {
  bookingId:          string
  clientName:         string
  eventType:          string
  eventDate:          string
  venue:              string
  guestCount:         number
  packageName:        string
  status:             string
  isProvincial:       boolean
  agreedPrice:        number
  paymentPlan:        string | null
  cancellationReason: string | null
  createdAt:          string
}

export interface BookingReport {
  meta: ReportMeta
  summary: {
    total:            number
    byStatus:         Record<string, number>
    byEventType:      Record<string, number>
    byMonth:          { month: string; count: number }[]
    /** Sum of agreed prices of CONFIRMED bookings in the filtered set. */
    confirmedValue:   number
    confirmedGuests:  number
  }
  rows: BookingReportRow[]
}

// ─────────────────────────────────────────────────────────────────
// Payment & transaction report (FR-53)
// ─────────────────────────────────────────────────────────────────

export interface PaymentReportRow {
  paymentId:         string
  bookingId:         string
  clientName:        string
  eventType:         string
  eventDate:         string
  paymentType:       string
  installmentOrder:  number | null
  method:            string
  amount:            number
  /** Derived: SCREENSHOT | REFERENCE_NUMBER | NONE (the schema has no proofType column). */
  proofType:         "SCREENSHOT" | "REFERENCE_NUMBER" | "NONE"
  referenceNumber:   string | null
  status:            string
  submittedAt:       string | null
  /** For VERIFIED this is the verifier; for FLAGGED it is the staff member who flagged it. */
  reviewedByName:    string | null
  reviewedAt:        string | null
  verificationNote:  string | null
}

export interface OutstandingBalanceRow {
  bookingId:    string
  clientName:   string
  eventType:    string
  eventDate:    string
  paymentPlan:  string | null
  agreedPrice:  number
  verifiedPaid: number
  outstanding:  number
  /** Next unpaid installment due date, or the full-payment due date for FULL plans. */
  nextDueDate:  string | null
  isOverdue:    boolean
  daysOverdue:  number
}

export interface InstallmentSummary {
  total:                number
  paid:                 number
  unpaid:               number
  /** UNPAID, past due, and no proof currently awaiting verification. */
  overdue:              number
  awaitingVerification: number
  paidAmount:           number
  unpaidAmount:         number
  overdueAmount:        number
}

export interface PaymentReport {
  meta: ReportMeta
  /** Transaction figures — cover the filtered set (date range + filters). */
  summary: {
    transactions:    number
    verifiedCount:   number
    verifiedAmount:  number
    awaitingCount:   number   // SUBMITTED
    awaitingAmount:  number
    flaggedCount:    number
    flaggedAmount:   number
    /** VERIFIED collections only. */
    byMethod:        { method: string; count: number; amount: number }[]
    byType:          { paymentType: string; count: number; amount: number }[]
  }
  /** "As of now" snapshots — independent of the date filter. */
  snapshot: {
    asOf:              string
    outstandingTotal:  number
    bookingsWithBalance: number
    overdueBookings:   number
    installments:      InstallmentSummary
  }
  outstanding: OutstandingBalanceRow[]   // capped to the 100 most urgent
  rows:        PaymentReportRow[]
}

// ─────────────────────────────────────────────────────────────────
// Vendor coordination report (FR-54)
// ─────────────────────────────────────────────────────────────────

export type VendorAssignmentStatus = "NOT_CONTACTED" | "CONTACTED" | "CONFIRMED"

export interface VendorReportRow {
  assignmentId:   string
  bookingId:      string
  eventType:      string
  eventDate:      string
  venue:          string
  bookingStatus:  string
  vendorName:     string
  category:       string
  status:         VendorAssignmentStatus
  contactedAt:    string | null
  confirmedAt:    string | null
  quotationAmount: number | null
  quotationNote:  string | null
}

export interface VendorGapRow {
  bookingId:         string
  clientName:        string
  eventType:         string
  eventDate:         string
  bookingStatus:     string
  requested:         string[]
  missing:           string[]
}

export interface VendorReport {
  meta: ReportMeta
  summary: {
    totalAssignments: number
    confirmed:        number
    contacted:        number   // contacted, awaiting confirmation
    notContacted:     number
    quotedCount:      number
    quotationTotal:   number
    byCategory:       { category: string; assignments: number; confirmed: number; quotationTotal: number }[]
    gapEvents:        number
  }
  /** Upcoming events (in range) with a requested category that has no confirmed vendor. */
  gaps: VendorGapRow[]
  rows: VendorReportRow[]
}

// ─────────────────────────────────────────────────────────────────
// Staff scheduling report (FR-55)
// ─────────────────────────────────────────────────────────────────

export type StaffCompliance = "COMPLIANT" | "UNDERSTAFFED" | "OVERSTAFFED"

export interface StaffReportRow {
  bookingId:        string
  eventType:        string
  eventDate:        string
  venue:            string
  bookingStatus:    string
  guestCount:       number
  recommendedMin:   number
  recommendedMax:   number
  recommendationLabel: string
  primaryCount:     number
  backupCount:      number
  compliance:       StaffCompliance
  hasBackup:        boolean
  /** e.g. ["Maria Santos", "Paolo Mendoza (backup)"] */
  coordinators:     string[]
  hasConflict:      boolean
}

export interface CoordinatorLoadRow {
  coordinatorId:  string
  name:           string
  isActive:       boolean
  primaryCount:   number
  backupCount:    number
  conflictDates:  number
}

export interface StaffReport {
  meta: ReportMeta
  summary: {
    events:            number
    compliant:         number
    understaffed:      number
    overstaffed:       number
    withoutBackup:     number
    eventsWithConflicts: number
    totalAssignments:  number
  }
  coordinators: CoordinatorLoadRow[]
  rows:         StaffReportRow[]
}

// ─────────────────────────────────────────────────────────────────
// Audit trail report (FR-56)
// ─────────────────────────────────────────────────────────────────

export interface AuditReportRow {
  id:           string
  sequence:     number
  createdAt:    string
  userName:     string | null
  userRole:     string | null
  action:       string
  module:       string
  description:  string
  status:       string
  hash:         string
  previousHash: string | null
}

export interface AuditReport {
  meta: ReportMeta
  summary: {
    totalEntries:  number
    failureCount:  number
    uniqueUsers:   number
    byModule:      { module: string; count: number }[]
    byAction:      { action: string; count: number }[]
    topUsers:      { userId: string; name: string; count: number }[]
    /** Manila calendar day → entry count, ascending. */
    byDay:         { date: string; count: number }[]
  }
  /** Fresh full-chain verification, computed on every audit report request. */
  chain: ChainIntegrityResult
  rows:  AuditReportRow[]
}

export type AnyReport = BookingReport | PaymentReport | VendorReport | StaffReport | AuditReport
