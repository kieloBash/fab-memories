// features/reports/reports.constants.ts

// ── Report catalogue ─────────────────────────────────────────────

export const REPORT_TYPES = ["bookings", "payments", "vendors", "staff", "audit"] as const
export type ReportType = (typeof REPORT_TYPES)[number]

export const REPORT_LABELS: Record<ReportType, string> = {
  bookings: "Booking & scheduling",
  payments: "Payments & transactions",
  vendors:  "Vendor coordination",
  staff:    "Staff scheduling",
  audit:    "Audit trail",
}

export const REPORT_DESCRIPTIONS: Record<ReportType, string> = {
  bookings: "Confirmed, pending and cancelled bookings with event details (FR-52).",
  payments: "Submitted proofs, verifications, outstanding balances and installment summary (FR-53).",
  vendors:  "Vendor assignments, confirmation status, quotations and coverage gaps (FR-54).",
  staff:    "Coordinator assignments, staffing levels and backup coverage per event (FR-55).",
  audit:    "Logged user actions by module, action and user, with hash-chain integrity (FR-56).",
}

/** FR-57 / FR-50 — the audit report is admin-only; the other four are open to coordinators. */
export const REPORT_ROLES: Record<ReportType, ("ADMIN" | "COORDINATOR")[]> = {
  bookings: ["ADMIN", "COORDINATOR"],
  payments: ["ADMIN", "COORDINATOR"],
  vendors:  ["ADMIN", "COORDINATOR"],
  staff:    ["ADMIN", "COORDINATOR"],
  audit:    ["ADMIN"],
}

export function isReportType(value: string): value is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(value)
}

// ── Time & paging ────────────────────────────────────────────────

/** All "today" / "overdue" / day-boundary calculations use the business's local time. */
export const REPORT_TIMEZONE = "Asia/Manila"

export const REPORT_PAGE_SIZE_DEFAULT = 25
export const REPORT_PAGE_SIZE_MAX     = 200

/** Hard ceiling on rows in a single CSV export (matches the existing audit export). */
export const EXPORT_ROW_LIMIT = 10_000

/**
 * VIEW audit entries for the same user + same report + same filters are
 * written at most once per window. Without this, the dashboard's polling
 * (and pagination) would flood the audit trail with identical entries.
 * Every distinct access is still recorded (FR-48).
 */
export const VIEW_LOG_DEDUP_MINUTES = 10

// ── Risk engine thresholds (Module 8 — proactive risk mitigation) ─

export const RISK_THRESHOLDS = {
  /** Payment proof waiting longer than this is flagged (MEDIUM). */
  PROOF_STALE_HOURS: 24,
  /** ...and escalates to HIGH beyond this. */
  PROOF_CRITICAL_HOURS: 72,
  /** Events within this many days are "imminent" for staffing/vendor checks. */
  IMMINENT_DAYS: 30,
  /** Imminent events within this many days escalate to HIGH. */
  CRITICAL_DAYS: 7,
  /** Flagged payment with no resubmission escalates to HIGH after this many days. */
  FLAGGED_CRITICAL_DAYS: 7,
  /** Client cancellation request unanswered longer than this is HIGH. */
  CANCELLATION_STALE_HOURS: 72,
  /** Look-back window for FAILURE audit entries. */
  AUDIT_FAILURE_WINDOW_HOURS: 24,
  AUDIT_FAILURE_WARN: 3,
  AUDIT_FAILURE_CRITICAL: 10,
  /** Hash-chain verification is O(n); cache the dashboard's result this long. */
  CHAIN_CHECK_TTL_MS: 5 * 60 * 1000,
  /** Safety cap on rows fetched per risk rule. */
  MAX_ROWS_PER_RULE: 200,
  /** Safety cap on total risk items returned. */
  MAX_ITEMS: 100,
} as const

export const RISK_KIND_LABELS = {
  PROOF_UNVERIFIED:           "Payment proof awaiting verification",
  PAYMENT_FLAGGED:            "Flagged payment not resubmitted",
  DEPOSIT_OVERDUE:            "Deposit overdue",
  INSTALLMENT_OVERDUE:        "Installment overdue",
  FULL_BALANCE_OVERDUE:       "Full balance overdue",
  CONFIRMED_WITHOUT_DEPOSIT:  "Confirmed without a verified deposit",
  UNDERSTAFFED_IMMINENT:      "Imminent event understaffed",
  VENDOR_GAP_IMMINENT:        "Imminent event missing vendor",
  COORDINATOR_CONFLICT:       "Coordinator double-booked",
  CANCELLATION_PENDING:       "Cancellation request awaiting action",
  DOUBLE_CONFIRMED:           "Two confirmed events on one date",
  DATE_CONTENTION:            "Competing booking requests for one date",
  AUDIT_INTEGRITY:            "Audit chain integrity failure",
  AUDIT_FAILURES:             "Repeated failed actions",
} as const

// ── React Query keys & API routes ────────────────────────────────

export const reportKeys = {
  dashboard: ["reports-dashboard"] as const,
  report:    (type: ReportType, filters: unknown) => ["reports", type, filters] as const,
}

export const reportRoutes = {
  dashboard: "/reports/dashboard",
  report:    (type: ReportType) => `/reports/${type}`,
  export:    (type: ReportType) => `/reports/${type}/export`,
} as const
