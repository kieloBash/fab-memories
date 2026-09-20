// features/reports/index.ts
//
// Barrel — CLIENT-SAFE exports only.
// Server-only modules (queries, risk engine, handler, registry, logging,
// export builder) are imported directly by route handlers and must never be
// re-exported here, or they would be pulled into the browser bundle.

export {
  REPORT_TYPES, REPORT_LABELS, REPORT_DESCRIPTIONS, REPORT_ROLES, RISK_KIND_LABELS,
  RISK_THRESHOLDS, EXPORT_ROW_LIMIT, REPORT_TIMEZONE, isReportType,
  reportKeys, reportRoutes,
} from "./reports.constants"
export type { ReportType } from "./reports.constants"

export { reportFilterSchema, reportExportQuerySchema, parseReportFilters } from "./reports.schema"
export type { ReportFilterInput, ReportFilterFormValues } from "./reports.schema"

export { manilaYmd, manilaToday, toYmd } from "./reports.dates"

export type {
  ReportMeta, CountItem,
  RiskSeverity, RiskKind, RiskIndicator, RiskSummary, RiskReport,
  AdminDashboardSummary, NeedsAttentionItem, UpcomingEventSummary, RecentAuditItem,
  BookingReport, BookingReportRow,
  PaymentReport, PaymentReportRow, OutstandingBalanceRow, InstallmentSummary,
  VendorReport, VendorReportRow, VendorGapRow, VendorAssignmentStatus,
  StaffReport, StaffReportRow, StaffCompliance, CoordinatorLoadRow,
  AuditReport, AuditReportRow, AnyReport,
} from "./reports.types"

export { fetchAdminDashboardSummary, fetchReport, downloadReport } from "./reports.api"
export { useAdminDashboardSummary, useRiskRegister, useReport, useExportReport } from "./reports.hooks"
