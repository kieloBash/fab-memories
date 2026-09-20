// features/reports/components/views/booking-report-view.tsx
"use client"

import Link from "next/link"
import { Banknote, CalendarDays, CheckCircle2, Clock, Users, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ColumnChart, HBarChart } from "../charts"
import { MetaFooter, MetricGrid, ReportTable, SectionCard, TablePager, type Column } from "../report-ui"
import {
  bookingStatusVariant, EVENT_TYPE_LABELS, fmtYmd, humanize, peso, STATUS_BAR,
} from "../../reports.format"
import type { BookingReport, BookingReportRow } from "../../reports.types"
import { bookingHref, type ViewProps } from "./report-view-types"

export function BookingReportView({ report, basePath, onPage, isFetching }: ViewProps<BookingReport>) {
  const { summary, meta } = report

  const columns: Column<BookingReportRow>[] = [
    { key: "client", header: "Client", cell: (r) => (
      <Link href={bookingHref(basePath, r.bookingId)} className="font-medium text-primary hover:underline">{r.clientName}</Link>
    ) },
    { key: "type",  header: "Event",   cell: (r) => EVENT_TYPE_LABELS[r.eventType] ?? r.eventType },
    { key: "date",  header: "Date",    cell: (r) => <span className="whitespace-nowrap">{fmtYmd(r.eventDate)}</span> },
    { key: "venue", header: "Venue",   cell: (r) => <span className="line-clamp-1 max-w-[220px]" title={r.venue}>{r.venue}</span> },
    { key: "guests",header: "Guests",  cell: (r) => r.guestCount, align: "right" },
    { key: "pkg",   header: "Package", cell: (r) => <span className="line-clamp-1 max-w-[180px]">{r.packageName}</span> },
    { key: "rate",  header: "Rate",    cell: (r) => (r.isProvincial ? "Provincial" : "Metro") },
    { key: "price", header: "Price",   cell: (r) => <span className="whitespace-nowrap">{peso(r.agreedPrice)}</span>, align: "right" },
    { key: "plan",  header: "Plan",    cell: (r) => (r.paymentPlan ? humanize(r.paymentPlan) : <span className="text-text-muted">—</span>) },
    { key: "status",header: "Status",  cell: (r) => <Badge variant={bookingStatusVariant(r.status)} className="text-[10px]">{humanize(r.status)}</Badge> },
  ]

  return (
    <div className="flex flex-col gap-5">
      <MetricGrid metrics={[
        { label: "Bookings",          value: summary.total.toLocaleString(), icon: CalendarDays },
        { label: "Confirmed",         value: summary.byStatus.CONFIRMED ?? 0, icon: CheckCircle2, tone: "good" },
        { label: "Pending",           value: summary.byStatus.PENDING ?? 0, icon: Clock, tone: (summary.byStatus.PENDING ?? 0) > 0 ? "warn" : "default" },
        { label: "Cancelled",         value: (summary.byStatus.CANCELLED ?? 0) + (summary.byStatus.CANCELLATION_REQUESTED ?? 0), icon: XCircle,
          hint: (summary.byStatus.CANCELLATION_REQUESTED ?? 0) > 0 ? `${summary.byStatus.CANCELLATION_REQUESTED} awaiting decision` : undefined },
        { label: "Confirmed value",   value: peso(summary.confirmedValue), icon: Banknote, hint: "Agreed prices" },
        { label: "Confirmed guests",  value: summary.confirmedGuests.toLocaleString(), icon: Users },
      ]} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="By status">
          <div className="p-5">
            <HBarChart label="Bookings by status" data={Object.entries(summary.byStatus).map(([k, v]) => ({ label: humanize(k), value: v, className: STATUS_BAR[k] }))} />
          </div>
        </SectionCard>
        <SectionCard title="By event type">
          <div className="p-5">
            <HBarChart label="Bookings by event type" data={Object.entries(summary.byEventType).map(([k, v]) => ({ label: EVENT_TYPE_LABELS[k] ?? k, value: v }))} />
          </div>
        </SectionCard>
        <SectionCard title="By month" subtitle="Event month">
          <div className="p-5">
            <ColumnChart label="Bookings by month" data={summary.byMonth.map((m) => ({ label: m.month.slice(2), value: m.count }))} />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Bookings" subtitle={`${meta.totalRows.toLocaleString()} in this selection`}>
        <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <ReportTable columns={columns} rows={report.rows} rowKey={(r) => r.bookingId} />
        </div>
        <TablePager meta={meta} onPage={onPage} />
      </SectionCard>
      <MetaFooter meta={meta} />
    </div>
  )
}
