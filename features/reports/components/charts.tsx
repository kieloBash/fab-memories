// features/reports/components/charts.tsx
"use client"

//
// Dependency-free charts (plain CSS bars) — no charting library to install,
// bundle or keep updated. Good enough for the shapes the reports need:
// a ranked list of categories, and a short time series.
//

import { cn } from "@/lib/utils"

export interface BarDatum { label: string; value: number; className?: string }

export function HBarChart({
  data, format = (n: number) => n.toLocaleString(), label, emptyLabel = "No data for this selection.",
}: {
  data: BarDatum[]; format?: (n: number) => string; label: string; emptyLabel?: string
}) {
  const visible = data.filter((d) => d.value > 0)
  if (visible.length === 0) return <p className="py-6 text-center text-[12px] text-text-muted">{emptyLabel}</p>
  const max = Math.max(...visible.map((d) => d.value))
  return (
    <ul className="space-y-2.5" aria-label={label}>
      {visible.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-[12px]">
            <span className="truncate text-text-sub">{d.label}</span>
            <span className="shrink-0 font-semibold text-text-main">{format(d.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-pill bg-primary-soft/60">
            <div
              className={cn("h-full rounded-pill bg-primary", d.className)}
              style={{ width: `${Math.max(3, (d.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function ColumnChart({
  data, label, emptyLabel = "No data for this selection.",
}: {
  data: { label: string; value: number }[]; label: string; emptyLabel?: string
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className="py-6 text-center text-[12px] text-text-muted">{emptyLabel}</p>
  }
  const max = Math.max(...data.map((d) => d.value))
  return (
    <div className="overflow-x-auto">
      <ul className="flex h-40 min-w-full items-end gap-1.5" aria-label={label}>
        {data.map((d) => (
          <li key={d.label} className="flex h-full min-w-[28px] flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${d.value}`}>
            <span className="text-[10px] font-semibold text-text-sub">{d.value}</span>
            <div className="w-full rounded-t-md bg-primary" style={{ height: `${Math.max(4, (d.value / max) * 100)}%`, maxHeight: "calc(100% - 32px)" }} />
            <span className="text-[10px] text-text-muted">{d.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
