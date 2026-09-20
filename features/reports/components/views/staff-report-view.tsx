// features/reports/components/views/staff-report-view.tsx
"use client"

import Link from "next/link"
import { AlertTriangle, CalendarDays, CheckCircle2, UserMinus, UserPlus, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Chip, MetaFooter, MetricGrid, ReportTable, SectionCard, TablePager, type Column } from "../report-ui"
import { bookingStatusVariant, EVENT_TYPE_LABELS, fmtYmd, humanize } from "../../reports.format"
import type { CoordinatorLoadRow, StaffReport, StaffReportRow } from "../../reports.types"
import { bookingHref, type ViewProps } from "./report-view-types"

const LEVEL: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  COMPLIANT:    { label: "On target",    variant: "success" },
  UNDERSTAFFED: { label: "Understaffed", variant: "warning" },
  OVERSTAFFED:  { label: "Overstaffed",  variant: "secondary" },
}

export function StaffReportView({ report, basePath, onPage, isFetching }: ViewProps<StaffReport>) {
  const { summary, meta } = report

  const loadCols: Column<CoordinatorLoadRow>[] = [
    { key: "name", header: "Coordinator", cell: (r) => (
      <span className="font-medium text-text-main">{r.name} {!r.isActive && <Chip>Inactive</Chip>}</span>
    ) },
    { key: "p", header: "Primary", cell: (r) => r.primaryCount, align: "right" },
    { key: "b", header: "Backup", cell: (r) => r.backupCount, align: "right" },
    { key: "c", header: "Conflicting dates", cell: (r) => (r.conflictDates > 0 ? <Chip tone="danger">{r.conflictDates}</Chip> : <span className="text-text-muted">0</span>), align: "right" },
  ]

  const cols: Column<StaffReportRow>[] = [
    { key: "event", header: "Event", cell: (r) => (
      <Link href={bookingHref(basePath, r.bookingId)} className="font-medium text-primary hover:underline">
        {EVENT_TYPE_LABELS[r.eventType] ?? r.eventType}
      </Link>
    ) },
    { key: "date", header: "Date", cell: (r) => <span className="whitespace-nowrap">{fmtYmd(r.eventDate)}</span> },
    { key: "bstatus", header: "Booking", cell: (r) => <Badge variant={bookingStatusVariant(r.bookingStatus)} className="text-[10px]">{humanize(r.bookingStatus)}</Badge> },
    { key: "guests", header: "Guests", cell: (r) => r.guestCount, align: "right" },
    { key: "rec", header: "Recommended", cell: (r) => (r.recommendedMin === r.recommendedMax ? r.recommendedMin : `${r.recommendedMin}–${r.recommendedMax}`), align: "right" },
    { key: "asg", header: "Assigned", cell: (r) => <span title="primary / backup">{r.primaryCount} / {r.backupCount}</span>, align: "right" },
    { key: "level", header: "Level", cell: (r) => <Badge variant={LEVEL[r.compliance].variant} className="text-[10px]">{LEVEL[r.compliance].label}</Badge> },
    { key: "who", header: "Coordinators", cell: (r) => (
      <span className="line-clamp-2 max-w-[260px]">{r.coordinators.length ? r.coordinators.join(", ") : <span className="text-text-muted">None assigned</span>}</span>
    ) },
    { key: "flags", header: "Flags", cell: (r) => (
      <span className="flex flex-wrap gap-1">
        {r.hasConflict && <Chip tone="danger">Conflict</Chip>}
        {!r.hasBackup && <Chip tone="warn">No backup</Chip>}
      </span>
    ) },
  ]

  return (
    <div className="flex flex-col gap-5">
      <MetricGrid metrics={[
        { label: "Events", value: summary.events, icon: CalendarDays },
        { label: "On target", value: summary.compliant, icon: CheckCircle2, tone: "good" },
        { label: "Understaffed", value: summary.understaffed, icon: UserMinus, tone: summary.understaffed > 0 ? "warn" : "default", hint: "Below FR-37 minimum" },
        { label: "Overstaffed", value: summary.overstaffed, icon: UserPlus },
        { label: "No backup", value: summary.withoutBackup, icon: Users, tone: summary.withoutBackup > 0 ? "warn" : "default" },
        { label: "With conflicts", value: summary.eventsWithConflicts, icon: AlertTriangle, tone: summary.eventsWithConflicts > 0 ? "danger" : "good", hint: "Coordinator double-booked" },
      ]} />

      <SectionCard title="Coordinator workload" subtitle="Assignments across the events in this selection">
        <ReportTable columns={loadCols} rows={report.coordinators} rowKey={(r) => r.coordinatorId} emptyMessage="No coordinators on the roster." />
      </SectionCard>

      <SectionCard title="Events" subtitle={`${meta.totalRows.toLocaleString()} in this selection`}>
        <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <ReportTable columns={cols} rows={report.rows} rowKey={(r) => r.bookingId} />
        </div>
        <TablePager meta={meta} onPage={onPage} />
      </SectionCard>
      <MetaFooter meta={meta} />
    </div>
  )
}
