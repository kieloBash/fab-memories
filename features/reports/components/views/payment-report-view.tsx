// features/reports/components/views/payment-report-view.tsx
"use client"

import Link from "next/link"
import { AlertTriangle, Banknote, CheckCircle2, Clock, Flag, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { HBarChart } from "../charts"
import { Chip, MetaFooter, MetricGrid, ReportTable, SectionCard, TablePager, type Column } from "../report-ui"
import { bookingStatusVariant, EVENT_TYPE_LABELS, fmtDateTime, fmtYmd, humanize, paymentStatusVariant, peso } from "../../reports.format"
import type { OutstandingBalanceRow, PaymentReport, PaymentReportRow } from "../../reports.types"
import { bookingHref, paymentHref, type ViewProps } from "./report-view-types"

export function PaymentReportView({ report, basePath, onPage, isFetching }: ViewProps<PaymentReport>) {
  const { summary, snapshot, meta } = report
  const inst = snapshot.installments

  const outstandingCols: Column<OutstandingBalanceRow>[] = [
    { key: "client", header: "Client", cell: (r) => (
      <Link href={bookingHref(basePath, r.bookingId)} className="font-medium text-primary hover:underline">{r.clientName}</Link>
    ) },
    { key: "event", header: "Event", cell: (r) => `${EVENT_TYPE_LABELS[r.eventType] ?? r.eventType} · ${fmtYmd(r.eventDate)}` },
    { key: "plan",  header: "Plan",  cell: (r) => (r.paymentPlan ? humanize(r.paymentPlan) : "—") },
    { key: "agreed",header: "Agreed", cell: (r) => peso(r.agreedPrice), align: "right" },
    { key: "paid",  header: "Verified paid", cell: (r) => peso(r.verifiedPaid), align: "right" },
    { key: "out",   header: "Outstanding", cell: (r) => <strong>{peso(r.outstanding)}</strong>, align: "right" },
    { key: "due",   header: "Next due", cell: (r) => (
      r.nextDueDate
        ? <span className="whitespace-nowrap">{fmtYmd(r.nextDueDate)} {r.isOverdue && <Chip tone="danger">{r.daysOverdue}d overdue</Chip>}</span>
        : <span className="text-text-muted">No due date set</span>
    ) },
  ]

  const txCols: Column<PaymentReportRow>[] = [
    { key: "client", header: "Client", cell: (r) => (
      <Link href={paymentHref(basePath, r.paymentId)} className="font-medium text-primary hover:underline">{r.clientName}</Link>
    ) },
    { key: "type",   header: "Type",   cell: (r) => `${humanize(r.paymentType)}${r.installmentOrder ? ` #${r.installmentOrder}` : ""}` },
    { key: "method", header: "Method", cell: (r) => humanize(r.method) },
    { key: "amount", header: "Amount", cell: (r) => <span className="whitespace-nowrap">{peso(r.amount)}</span>, align: "right" },
    { key: "proof",  header: "Proof",  cell: (r) => (
      <span title={r.referenceNumber ?? undefined}>{r.proofType === "SCREENSHOT" ? "Screenshot" : r.proofType === "REFERENCE_NUMBER" ? "Reference no." : "None"}</span>
    ) },
    { key: "status", header: "Status", cell: (r) => <Badge variant={paymentStatusVariant(r.status)} className="text-[10px]">{humanize(r.status)}</Badge> },
    { key: "sub",    header: "Submitted", cell: (r) => (r.submittedAt ? <span className="whitespace-nowrap">{fmtDateTime(r.submittedAt)}</span> : "—") },
    { key: "by",     header: "Reviewed by", cell: (r) => r.reviewedByName ?? <span className="text-text-muted">—</span> },
  ]

  return (
    <div className="flex flex-col gap-5">
      <MetricGrid metrics={[
        { label: "Transactions", value: summary.transactions.toLocaleString(), icon: Wallet, hint: "In this selection" },
        { label: "Verified", value: peso(summary.verifiedAmount), icon: CheckCircle2, tone: "good", hint: `${summary.verifiedCount} payments` },
        { label: "Awaiting verification", value: peso(summary.awaitingAmount), icon: Clock, tone: summary.awaitingCount > 0 ? "warn" : "default", hint: `${summary.awaitingCount} payments` },
        { label: "Flagged", value: peso(summary.flaggedAmount), icon: Flag, tone: summary.flaggedCount > 0 ? "danger" : "default", hint: `${summary.flaggedCount} payments` },
        { label: "Outstanding now", value: peso(snapshot.outstandingTotal), icon: Banknote, hint: `${snapshot.bookingsWithBalance} bookings · as of ${fmtYmd(snapshot.asOf)}` },
        { label: "Overdue bookings", value: snapshot.overdueBookings, icon: AlertTriangle, tone: snapshot.overdueBookings > 0 ? "danger" : "good", hint: "Past a due date" },
      ]} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="Verified by method" subtitle="PHP collected">
          <div className="p-5"><HBarChart label="Verified amount by method" format={peso}
            data={summary.byMethod.map((m) => ({ label: humanize(m.method), value: m.amount }))} /></div>
        </SectionCard>
        <SectionCard title="Verified by type" subtitle="PHP collected">
          <div className="p-5"><HBarChart label="Verified amount by payment type" format={peso}
            data={summary.byType.map((m) => ({ label: humanize(m.paymentType), value: m.amount }))} /></div>
        </SectionCard>
        <SectionCard title="Installments" subtitle={`Snapshot · ${inst.total} total`}>
          <dl className="grid grid-cols-2 gap-3 p-5 text-[12px]">
            <div><dt className="text-text-muted">Paid</dt><dd className="text-[16px] font-bold text-emerald-700">{inst.paid}</dd><dd className="text-text-muted">{peso(inst.paidAmount)}</dd></div>
            <div><dt className="text-text-muted">Unpaid</dt><dd className="text-[16px] font-bold text-text-main">{inst.unpaid}</dd><dd className="text-text-muted">{peso(inst.unpaidAmount)}</dd></div>
            <div><dt className="text-text-muted">Overdue</dt><dd className={`text-[16px] font-bold ${inst.overdue > 0 ? "text-red-600" : "text-text-main"}`}>{inst.overdue}</dd><dd className="text-text-muted">{peso(inst.overdueAmount)}</dd></div>
            <div><dt className="text-text-muted">Awaiting verification</dt><dd className="text-[16px] font-bold text-amber-600">{inst.awaitingVerification}</dd><dd className="text-text-muted">Proof submitted</dd></div>
          </dl>
        </SectionCard>
      </div>

      <SectionCard
        title="Outstanding balances"
        subtitle={`As of ${fmtYmd(snapshot.asOf)} — independent of the date filter · overdue first`}
        tone={snapshot.overdueBookings > 0 ? "warn" : undefined}
      >
        <ReportTable columns={outstandingCols} rows={report.outstanding} rowKey={(r) => r.bookingId} emptyMessage="No outstanding balances — every active booking is paid in full." />
      </SectionCard>

      <SectionCard title="Transactions" subtitle={`${meta.totalRows.toLocaleString()} in this selection`}>
        <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <ReportTable columns={txCols} rows={report.rows} rowKey={(r) => r.paymentId} />
        </div>
        <TablePager meta={meta} onPage={onPage} />
      </SectionCard>
      <MetaFooter meta={meta} />
    </div>
  )
}
