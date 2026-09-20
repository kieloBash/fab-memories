// features/reports/components/report-filters-bar.tsx
"use client"

import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AUDIT_ACTION_LABELS, AUDIT_MODULE_LABELS, useAuditFilterOptions } from "@/features/audit"
import { VENDOR_CATEGORY_LABELS } from "@/features/vendors"
import { cn } from "@/lib/utils"
import type { ReportType } from "../reports.constants"
import { addDays, manilaToday, manilaYmd, toYmd } from "../reports.dates"
import type { ReportFilterFormValues } from "../reports.schema"
import {
  AUDIT_STATUS_OPTIONS, BOOKING_STATUS_OPTIONS, COMPLIANCE_OPTIONS, DATE_FILTER_HINT,
  EVENT_TYPE_OPTIONS, PAYMENT_METHOD_OPTIONS, PAYMENT_STATUS_OPTIONS, PAYMENT_TYPE_OPTIONS,
  REPORT_FILTER_FIELDS, type Option,
} from "../reports.options"

const ALL = "__all__"

interface FieldDef { label: string; options: Option[]; width: string }

function FilterSelect({
  label, value, onChange, options, width,
}: {
  label: string; value?: string; onChange: (v: string | undefined) => void; options: Option[]; width: string
}) {
  const items = [{ value: ALL, label }, ...options]
  return (
    <Select
      items={items}
      value={value ?? ALL}
      onValueChange={(v) => onChange(!v || v === ALL ? undefined : v)}
    >
      <SelectTrigger className={cn("h-9 text-[12px]", width)} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

const PRESETS: { label: string; range: () => { from?: string; to?: string } }[] = [
  { label: "Next 30 days",  range: () => ({ from: manilaYmd(), to: toYmd(addDays(manilaToday(), 30)) }) },
  { label: "Last 30 days",  range: () => ({ from: toYmd(addDays(manilaToday(), -30)), to: manilaYmd() }) },
  { label: "This month",    range: () => { const t = manilaYmd(); return { from: `${t.slice(0, 8)}01`, to: undefined } } },
]

export function ReportFiltersBar({
  type, filters, onChange,
}: {
  type: ReportType
  filters: ReportFilterFormValues
  onChange: (next: ReportFilterFormValues) => void
}) {
  const { data: auditOptions } = useAuditFilterOptions()

  // Dates are edited as a draft and only applied when the range is valid,
  // so an impossible range never reaches the API (which would answer 422).
  const [from, setFrom] = useState(filters.from ?? "")
  const [to, setTo] = useState(filters.to ?? "")
  const [search, setSearch] = useState(filters.search ?? "")
  useEffect(() => { setFrom(filters.from ?? ""); setTo(filters.to ?? "") }, [filters.from, filters.to])
  useEffect(() => { setSearch(filters.search ?? "") }, [filters.search])

  const rangeError = from && to && from > to ? "The 'from' date must not be after the 'to' date." : null

  const set = (patch: Partial<ReportFilterFormValues>) => onChange({ ...filters, ...patch, page: 1 })

  const applyDate = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom); setTo(nextTo)
    if (nextFrom && nextTo && nextFrom > nextTo) return
    set({ from: nextFrom || undefined, to: nextTo || undefined })
  }

  // Debounce free-text search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    if ((filters.search ?? "") === search.trim()) return
    const t = setTimeout(() => set({ search: search.trim() || undefined }), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const fields: Record<string, FieldDef> = {
    bookingStatus: { label: "All statuses",       options: BOOKING_STATUS_OPTIONS, width: "w-44" },
    eventType:     { label: "All event types",    options: EVENT_TYPE_OPTIONS,     width: "w-40" },
    paymentStatus: { label: "All payment statuses", options: PAYMENT_STATUS_OPTIONS, width: "w-48" },
    paymentType:   { label: "All payment types",  options: PAYMENT_TYPE_OPTIONS,   width: "w-44" },
    paymentMethod: { label: "All methods",        options: PAYMENT_METHOD_OPTIONS, width: "w-40" },
    vendorCategory:{ label: "All categories",     options: Object.entries(VENDOR_CATEGORY_LABELS).map(([value, label]) => ({ value, label: String(label) })), width: "w-44" },
    compliance:    { label: "All staffing levels", options: COMPLIANCE_OPTIONS,    width: "w-44" },
    userId:        { label: "All users",          options: (auditOptions?.users ?? []).map((u) => ({ value: u.id, label: u.fullName })), width: "w-44" },
    module:        { label: "All modules",        options: Object.entries(AUDIT_MODULE_LABELS).map(([value, label]) => ({ value, label: String(label) })), width: "w-44" },
    action:        { label: "All actions",        options: Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label: String(label) })), width: "w-40" },
    status:        { label: "All results",        options: AUDIT_STATUS_OPTIONS,   width: "w-36" },
  }

  const active =
    !!filters.from || !!filters.to || !!filters.search ||
    REPORT_FILTER_FIELDS[type].some((k) => filters[k] !== undefined)

  return (
    <div className="space-y-3 rounded-xl border border-border bg-white p-4" role="search" aria-label="Report filters">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">{DATE_FILTER_HINT[type]}</span>
        <Input type="date" value={from} onChange={(e) => applyDate(e.target.value, to)}
          className="h-9 w-[150px] text-[13px]" aria-label="From date" aria-invalid={!!rangeError} />
        <span className="text-[12px] text-text-muted">to</span>
        <Input type="date" value={to} onChange={(e) => applyDate(from, e.target.value)}
          className="h-9 w-[150px] text-[13px]" aria-label="To date" aria-invalid={!!rangeError} />
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button key={p.label} variant="outline" size="xs" onClick={() => { const r = p.range(); applyDate(r.from ?? "", r.to ?? "") }}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      {rangeError && <p role="alert" className="text-[12px] font-medium text-red-600">{rangeError}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {REPORT_FILTER_FIELDS[type].map((key) => {
          const def = fields[key as string]
          if (!def) return null
          return (
            <FilterSelect
              key={key as string}
              label={def.label}
              width={def.width}
              options={def.options}
              value={filters[key] as string | undefined}
              onChange={(v) => set({ [key]: v } as Partial<ReportFilterFormValues>)}
            />
          )
        })}

        {type === "audit" && (
          <div className="relative min-w-[200px] flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search descriptions…"
              className="h-9 pl-8 text-[13px]" aria-label="Search descriptions" />
          </div>
        )}

        {active && (
          <Button variant="ghost" size="sm" className="text-[12px] text-text-muted"
            onClick={() => { setFrom(""); setTo(""); setSearch(""); onChange({ pageSize: filters.pageSize }) }}>
            <X size={12} aria-hidden="true" /> Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
