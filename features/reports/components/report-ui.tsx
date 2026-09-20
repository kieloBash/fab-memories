// features/reports/components/report-ui.tsx
"use client"

import type { LucideIcon } from "lucide-react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { fmtDateTime } from "../reports.format"
import type { ReportMeta } from "../reports.types"

// ── Metric cards ─────────────────────────────────────────────────

export type Tone = "default" | "good" | "warn" | "danger"

const TONE: Record<Tone, { border: string; icon: string; iconBg: string; value: string }> = {
  default: { border: "border-border",       icon: "text-primary",     iconBg: "bg-primary-soft", value: "text-text-main" },
  good:    { border: "border-emerald-200",  icon: "text-emerald-600", iconBg: "bg-emerald-50",   value: "text-emerald-700" },
  warn:    { border: "border-amber-200",    icon: "text-amber-600",   iconBg: "bg-amber-50",     value: "text-amber-600" },
  danger:  { border: "border-red-200",      icon: "text-red-600",     iconBg: "bg-red-50",       value: "text-red-600" },
}

export interface Metric {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  tone?: Tone
}

export function MetricCard({ label, value, icon: Icon, hint, tone = "default" }: Metric) {
  const t = TONE[tone]
  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border bg-white p-4", t.border)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">{label}</p>
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", t.iconBg)}>
          <Icon size={15} className={t.icon} aria-hidden="true" />
        </div>
      </div>
      <p className={cn("text-[24px] font-bold leading-none tracking-tighter", t.value)}>{value}</p>
      {hint && <p className="text-[11px] text-text-muted">{hint}</p>}
    </div>
  )
}

export function MetricGrid({ metrics, isLoading }: { metrics: Metric[]; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-[104px] animate-pulse rounded-xl bg-border/30" />)}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((m) => <MetricCard key={m.label} {...m} />)}
    </div>
  )
}

// ── Section card ─────────────────────────────────────────────────

export function SectionCard({
  title, subtitle, actions, children, className, tone,
}: {
  title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string
  tone?: "warn"
}) {
  return (
    <section className={cn(
      "overflow-hidden rounded-xl border bg-white",
      tone === "warn" ? "border-amber-200" : "border-border", className,
    )}>
      <div className={cn(
        "flex items-center justify-between gap-3 border-b px-5 py-4",
        tone === "warn" ? "border-amber-200 bg-amber-50/60" : "border-border",
      )}>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-tight text-text-main">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-text-muted">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

// ── Generic table (scrolls horizontally on narrow screens — NFR-11) ─

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
  align?: "right"
}

export function ReportTable<T>({
  columns, rows, rowKey, isLoading, emptyMessage = "No results match these filters.",
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  isLoading?: boolean
  emptyMessage?: string
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={cn(c.align === "right" && "text-right", c.className)}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell key={c.key}><div className="h-3 w-3/4 animate-pulse rounded-full bg-primary-soft" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-10 text-center text-[13px] text-text-muted">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn("text-[12px]", c.align === "right" && "text-right", c.className)}>
                    {c.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Pager ────────────────────────────────────────────────────────

export function TablePager({ meta, onPage }: { meta: ReportMeta; onPage: (page: number) => void }) {
  if (meta.totalRows === 0) return null
  const from = (meta.page - 1) * meta.pageSize + 1
  const to = Math.min(meta.page * meta.pageSize, meta.totalRows)
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
      <p className="text-[12px] text-text-muted">
        Showing {from.toLocaleString()}–{to.toLocaleString()} of {meta.totalRows.toLocaleString()}
      </p>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Previous page">
          <ChevronLeft size={14} aria-hidden="true" /> Prev
        </Button>
        <span className="px-2 text-[12px] text-text-sub">Page {meta.page} of {meta.totalPages}</span>
        <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} aria-label="Next page">
          Next <ChevronRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

// ── Generation footer — the NFR-05 evidence line ─────────────────

export function MetaFooter({ meta }: { meta: ReportMeta }) {
  return (
    <p className="text-[11px] text-text-muted" data-testid="report-meta">
      Generated {fmtDateTime(meta.generatedAt)} · built in {meta.durationMs.toLocaleString()} ms · {meta.totalRows.toLocaleString()} matching row{meta.totalRows === 1 ? "" : "s"}
    </p>
  )
}

export function Chip({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "warn" | "danger" | "good" }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-pill border px-2 py-0.5 text-[10px] font-semibold",
      tone === "warn" && "border-amber-200 bg-amber-50 text-amber-700",
      tone === "danger" && "border-red-200 bg-red-50 text-red-600",
      tone === "good" && "border-emerald-200 bg-emerald-50 text-emerald-700",
      tone === "muted" && "border-border bg-background-blush text-text-sub",
    )}>{children}</span>
  )
}
