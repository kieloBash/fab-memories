// features/audit/components/audit-stat-cards.tsx
"use client"

import { useAuditStats } from "@/features/audit"
import { AUDIT_MODULE_LABELS } from "@/features/audit"
import { Activity, CalendarClock, AlertTriangle, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

export function AuditStatCards() {
  const { data: stats, isLoading } = useAuditStats()

  const cards = [
    { label: "Total logged actions", value: stats?.totalEntries, icon: Activity },
    { label: "Actions today",        value: stats?.entriesToday, icon: CalendarClock },
    {
      label: "Failed actions",
      value: stats?.failureCount,
      icon: AlertTriangle,
      warn: (stats?.failureCount ?? 0) > 0,
    },
    {
      label: "Most active module",
      value: stats?.mostActiveModule ? AUDIT_MODULE_LABELS[stats.mostActiveModule.module] : "—",
      sub: stats?.mostActiveModule ? `${stats.mostActiveModule.count} actions` : undefined,
      icon: BarChart3,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={cn(
            "bg-white border rounded-xl p-5 flex flex-col gap-2 transition-all hover:-translate-y-0.5 hover:shadow-card-hover",
            c.warn ? "border-amber-200" : "border-border",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
              {c.label}
            </p>
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              c.warn ? "bg-amber-50" : "bg-primary-soft",
            )}>
              <c.icon size={15} className={c.warn ? "text-amber-600" : "text-primary"} aria-hidden="true" />
            </div>
          </div>
          <p className={cn(
            "font-bold tracking-tighter leading-none",
            typeof c.value === "string" && c.value.length > 6 ? "text-[18px]" : "text-[26px]",
            c.warn ? "text-amber-600" : "text-text-main",
          )}>
            {isLoading ? "—" : c.value}
          </p>
          {c.sub && <p className="text-[11px] text-text-muted -mt-1">{c.sub}</p>}
        </div>
      ))}
    </div>
  )
}
