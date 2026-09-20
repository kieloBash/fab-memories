// features/reports/components/report-page.tsx
"use client"

import Link from "next/link"
import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, CalendarDays, CreditCard, Loader2, RefreshCw, ShieldCheck, Store, Users, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { getApiErrorMessage } from "@/lib/axios"
import { SPRING } from "@/lib/framer/framer-utils"
import { REPORT_DESCRIPTIONS, REPORT_LABELS, type ReportType } from "../reports.constants"
import { addDays, manilaToday, toYmd } from "../reports.dates"
import { useReport } from "../reports.hooks"
import type { ReportFilterFormValues } from "../reports.schema"
import type {
  AnyReport, AuditReport, BookingReport, PaymentReport, StaffReport, VendorReport,
} from "../reports.types"
import { EXPORT_TABLES, ExportReportButtons } from "./export-report-button"
import { ReportFiltersBar } from "./report-filters-bar"
import { MetricGrid } from "./report-ui"
import { AuditReportView } from "./views/audit-report-view"
import { BookingReportView } from "./views/booking-report-view"
import { PaymentReportView } from "./views/payment-report-view"
import type { BasePath } from "./views/report-view-types"
import { StaffReportView } from "./views/staff-report-view"
import { VendorReportView } from "./views/vendor-report-view"

const ICONS: Record<ReportType, LucideIcon> = {
  bookings: CalendarDays, payments: CreditCard, vendors: Store, staff: Users, audit: ShieldCheck,
}

const PAGE_SIZE = 25

/** The audit report opens on the last 30 days; the operational reports open unfiltered. */
function defaultFilters(type: ReportType): ReportFilterFormValues {
  return type === "audit"
    ? { from: toYmd(addDays(manilaToday(), -30)), pageSize: PAGE_SIZE }
    : { pageSize: PAGE_SIZE }
}

/**
 * One screen for all five reports: header + export, filter bar, then the
 * report-specific view. Used by both /staff/admin/reports/[type] and
 * /staff/coordinator/reports/[type] (the audit report is admin-only).
 */
export function ReportPage({ type, basePath }: { type: ReportType; basePath: BasePath }) {
  const [filters, setFilters] = useState<ReportFilterFormValues>(() => defaultFilters(type))
  const { data, isLoading, isFetching, error, refetch } = useReport<AnyReport>(type, filters)

  const onPage = (page: number) => setFilters((f) => ({ ...f, page }))

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="flex flex-col gap-5">
      <Link href={`${basePath}/reports`} className="inline-flex w-fit items-center gap-1 text-[12px] font-medium text-text-muted hover:text-primary">
        <ArrowLeft size={13} aria-hidden="true" /> All reports
      </Link>

      <PageHeader
        title={REPORT_LABELS[type]}
        subtitle={REPORT_DESCRIPTIONS[type]}
        icon={ICONS[type]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh report">
              {isFetching ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
              Refresh
            </Button>
            <ExportReportButtons type={type} filters={filters} tables={EXPORT_TABLES[type]} />
          </>
        }
      />

      <ReportFiltersBar type={type} filters={filters} onChange={setFilters} />

      {isLoading && <MetricGrid metrics={[]} isLoading />}

      {error && !data && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-[13px] font-semibold text-red-700">Couldn’t load this report</p>
          <p className="mt-1 text-[12px] text-red-600">{getApiErrorMessage(error)}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
        </div>
      )}

      {data && (
        <ReportBody type={type} report={data} basePath={basePath} onPage={onPage} isFetching={isFetching} />
      )}
    </motion.div>
  )
}

function ReportBody({
  type, report, basePath, onPage, isFetching,
}: { type: ReportType; report: AnyReport; basePath: BasePath; onPage: (p: number) => void; isFetching: boolean }) {
  const common = { basePath, onPage, isFetching }
  switch (type) {
    case "bookings": return <BookingReportView report={report as BookingReport} {...common} />
    case "payments": return <PaymentReportView report={report as PaymentReport} {...common} />
    case "vendors":  return <VendorReportView  report={report as VendorReport}  {...common} />
    case "staff":    return <StaffReportView   report={report as StaffReport}   {...common} />
    case "audit":    return <AuditReportView   report={report as AuditReport}   {...common} />
  }
}
