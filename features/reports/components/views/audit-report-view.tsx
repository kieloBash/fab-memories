// features/reports/components/views/audit-report-view.tsx
"use client"

import { Activity, AlertTriangle, ShieldAlert, ShieldCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ColumnChart, HBarChart } from "../charts"
import { MetaFooter, MetricGrid, ReportTable, SectionCard, TablePager, type Column } from "../report-ui"
import { fmtDateTime, humanize } from "../../reports.format"
import type { AuditReport, AuditReportRow } from "../../reports.types"
import type { ViewProps } from "./report-view-types"

export function AuditReportView({ report, onPage, isFetching }: ViewProps<AuditReport>) {
  const { summary, chain, meta } = report

  const cols: Column<AuditReportRow>[] = [
    { key: "seq",  header: "#", cell: (r) => <span className="font-mono">{r.sequence}</span>, align: "right" },
    { key: "time", header: "Timestamp", cell: (r) => <span className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</span> },
    { key: "user", header: "User", cell: (r) => (
      <span>{r.userName ?? <em className="text-text-muted">System</em>}{r.userRole && <span className="ml-1 text-[10px] text-text-muted">{humanize(r.userRole)}</span>}</span>
    ) },
    { key: "act",  header: "Action", cell: (r) => <Badge variant="secondary" className="text-[10px]">{humanize(r.action)}</Badge> },
    { key: "mod",  header: "Module", cell: (r) => humanize(r.module) },
    { key: "desc", header: "Description", cell: (r) => <span className="line-clamp-2 max-w-[360px]" title={r.description}>{r.description}</span> },
    { key: "res",  header: "Result", cell: (r) => <Badge variant={r.status === "FAILURE" ? "destructive" : "success"} className="text-[10px]">{humanize(r.status)}</Badge> },
    { key: "hash", header: "Hash", cell: (r) => <span className="font-mono text-[10px] text-text-muted" title={r.hash}>{r.hash.slice(0, 10)}…</span> },
  ]

  return (
    <div className="flex flex-col gap-5">
      <MetricGrid metrics={[
        { label: "Entries", value: summary.totalEntries.toLocaleString(), icon: Activity, hint: "In this selection" },
        { label: "Failed actions", value: summary.failureCount, icon: AlertTriangle, tone: summary.failureCount > 0 ? "warn" : "good" },
        { label: "Active users", value: summary.uniqueUsers, icon: Users },
        chain.isValid
          ? { label: "Chain integrity", value: "Intact", icon: ShieldCheck, tone: "good", hint: `${chain.totalEntries.toLocaleString()} entries verified just now` }
          : { label: "Chain integrity", value: "BROKEN", icon: ShieldAlert, tone: "danger", hint: `Breaks at entry #${chain.brokenAtSequence}` },
      ]} />

      {!chain.isValid && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-semibold text-red-700">Audit trail tampering detected</p>
            <p className="mt-0.5 text-[12px] text-red-600">
              The hash chain breaks at entry <strong>#{chain.brokenAtSequence}</strong>. {chain.reason}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="Activity by day" subtitle="Manila time" className="lg:col-span-2">
          <div className="p-5">
            <ColumnChart label="Audit entries per day" data={summary.byDay.map((d) => ({ label: d.date.slice(5), value: d.count }))} />
          </div>
        </SectionCard>
        <SectionCard title="By module">
          <div className="p-5"><HBarChart label="Entries by module" data={summary.byModule.map((m) => ({ label: humanize(m.module), value: m.count }))} /></div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="By action">
          <div className="p-5"><HBarChart label="Entries by action" data={summary.byAction.map((a) => ({ label: humanize(a.action), value: a.count }))} /></div>
        </SectionCard>
        <SectionCard title="Most active users" subtitle="Top 10">
          <div className="p-5"><HBarChart label="Entries by user" data={summary.topUsers.map((u) => ({ label: u.name, value: u.count }))} /></div>
        </SectionCard>
      </div>

      <SectionCard title="Audit entries" subtitle={`${meta.totalRows.toLocaleString()} in this selection · newest first`}>
        <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <ReportTable columns={cols} rows={report.rows} rowKey={(r) => r.id} />
        </div>
        <TablePager meta={meta} onPage={onPage} />
      </SectionCard>
      <MetaFooter meta={meta} />
    </div>
  )
}
