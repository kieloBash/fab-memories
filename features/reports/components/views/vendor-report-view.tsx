// features/reports/components/views/vendor-report-view.tsx
"use client"

import Link from "next/link"
import { AlertTriangle, CheckCircle2, MessageCircle, Receipt, Store, UserX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { HBarChart } from "../charts"
import { Chip, MetaFooter, MetricGrid, ReportTable, SectionCard, TablePager, type Column } from "../report-ui"
import { bookingStatusVariant, EVENT_TYPE_LABELS, fmtYmd, humanize, peso } from "../../reports.format"
import type { VendorGapRow, VendorReport, VendorReportRow } from "../../reports.types"
import { bookingHref, type ViewProps } from "./report-view-types"

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "muted" }> = {
  CONFIRMED:     { label: "Confirmed",     variant: "success" },
  CONTACTED:     { label: "Awaiting reply", variant: "warning" },
  NOT_CONTACTED: { label: "Not contacted", variant: "muted" },
}

export function VendorReportView({ report, basePath, onPage, isFetching }: ViewProps<VendorReport>) {
  const { summary, meta } = report

  const gapCols: Column<VendorGapRow>[] = [
    { key: "client", header: "Client", cell: (r) => (
      <Link href={bookingHref(basePath, r.bookingId)} className="font-medium text-primary hover:underline">{r.clientName}</Link>
    ) },
    { key: "event", header: "Event", cell: (r) => `${EVENT_TYPE_LABELS[r.eventType] ?? r.eventType} · ${fmtYmd(r.eventDate)}` },
    { key: "status", header: "Booking", cell: (r) => <Badge variant={bookingStatusVariant(r.bookingStatus)} className="text-[10px]">{humanize(r.bookingStatus)}</Badge> },
    { key: "missing", header: "No confirmed vendor for", cell: (r) => (
      <span className="flex flex-wrap gap-1">{r.missing.map((m) => <Chip key={m} tone="warn">{humanize(m)}</Chip>)}</span>
    ) },
  ]

  const cols: Column<VendorReportRow>[] = [
    { key: "event", header: "Event", cell: (r) => (
      <Link href={bookingHref(basePath, r.bookingId)} className="font-medium text-primary hover:underline">
        {EVENT_TYPE_LABELS[r.eventType] ?? r.eventType} · {fmtYmd(r.eventDate)}
      </Link>
    ) },
    { key: "vendor", header: "Vendor", cell: (r) => r.vendorName },
    { key: "cat",    header: "Category", cell: (r) => humanize(r.category) },
    { key: "status", header: "Status", cell: (r) => <Badge variant={STATUS[r.status].variant} className="text-[10px]">{STATUS[r.status].label}</Badge> },
    { key: "quote",  header: "Quotation", cell: (r) => (r.quotationAmount !== null ? <span className="whitespace-nowrap">{peso(r.quotationAmount)}</span> : <span className="text-text-muted">—</span>), align: "right" },
    { key: "note",   header: "Note", cell: (r) => <span className="line-clamp-1 max-w-[200px]" title={r.quotationNote ?? undefined}>{r.quotationNote ?? "—"}</span> },
  ]

  return (
    <div className="flex flex-col gap-5">
      <MetricGrid metrics={[
        { label: "Assignments",   value: summary.totalAssignments, icon: Store },
        { label: "Confirmed",     value: summary.confirmed, icon: CheckCircle2, tone: "good" },
        { label: "Awaiting reply", value: summary.contacted, icon: MessageCircle, tone: summary.contacted > 0 ? "warn" : "default" },
        { label: "Not contacted", value: summary.notContacted, icon: UserX, tone: summary.notContacted > 0 ? "warn" : "default" },
        { label: "Quoted",        value: peso(summary.quotationTotal), icon: Receipt, hint: `${summary.quotedCount} quotation${summary.quotedCount === 1 ? "" : "s"}` },
        { label: "Coverage gaps", value: summary.gapEvents, icon: AlertTriangle, tone: summary.gapEvents > 0 ? "danger" : "good", hint: "Upcoming events" },
      ]} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Assignments by category" subtitle="Confirmed shown in the table below">
          <div className="p-5"><HBarChart label="Assignments by category"
            data={summary.byCategory.map((c) => ({ label: humanize(c.category), value: c.assignments }))} /></div>
        </SectionCard>
        <SectionCard title="Quotations by category" subtitle="PHP">
          <div className="p-5"><HBarChart label="Quotation total by category" format={peso} emptyLabel="No quotations recorded yet."
            data={summary.byCategory.map((c) => ({ label: humanize(c.category), value: c.quotationTotal }))} /></div>
        </SectionCard>
      </div>

      <SectionCard title="Coverage gaps" subtitle="Upcoming events with a requested category that has no confirmed vendor" tone={report.gaps.length > 0 ? "warn" : undefined}>
        <ReportTable columns={gapCols} rows={report.gaps} rowKey={(r) => r.bookingId} emptyMessage="Every requested vendor category is covered." />
      </SectionCard>

      <SectionCard title="Vendor assignments" subtitle={`${meta.totalRows.toLocaleString()} in this selection`}>
        <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <ReportTable columns={cols} rows={report.rows} rowKey={(r) => r.assignmentId} />
        </div>
        <TablePager meta={meta} onPage={onPage} />
      </SectionCard>
      <MetaFooter meta={meta} />
    </div>
  )
}
