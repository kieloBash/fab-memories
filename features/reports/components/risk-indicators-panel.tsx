// features/reports/components/risk-indicators-panel.tsx
"use client"

import Link from "next/link"
import { useState } from "react"
import { CheckCircle2, ChevronRight, Loader2, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { RISK_KIND_LABELS } from "../reports.constants"
import { severityVariant } from "../reports.format"
import { useRiskRegister } from "../reports.hooks"
import type { RiskIndicator, RiskSummary } from "../reports.types"

const DOT = { HIGH: "bg-red-500", MEDIUM: "bg-amber-400", LOW: "bg-slate-300" } as const

function RiskRow({ risk }: { risk: RiskIndicator }) {
  const body = (
    <>
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[risk.severity])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-[13px] font-medium text-text-main">{risk.title}</p>
          <Badge variant={severityVariant(risk.severity)} className="text-[9px]">{risk.severity}</Badge>
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-text-muted">{risk.detail}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-text-muted/80">{RISK_KIND_LABELS[risk.kind]}</p>
      </div>
      {risk.href && <ChevronRight size={14} className="mt-1 shrink-0 text-text-muted" aria-hidden="true" />}
    </>
  )
  const cls = "flex items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-primary-soft/20"
  return risk.href
    ? <Link href={risk.href} className={cls} data-testid="risk-row">{body}</Link>
    : <div className={cls} data-testid="risk-row">{body}</div>
}

/**
 * The "proactive risk mitigation" panel (thesis objective 3). Shows the highest-
 * priority indicators from the dashboard payload; "View all" loads the full register.
 */
export function RiskIndicatorsPanel({
  risks, summary, isLoading,
}: { risks: RiskIndicator[]; summary?: RiskSummary; isLoading: boolean }) {
  const [open, setOpen] = useState(false)
  const register = useRiskRegister(open)
  const total = summary?.total ?? 0

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white" data-testid="risk-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", (summary?.high ?? 0) > 0 ? "bg-red-50" : "bg-emerald-50")}>
            {(summary?.high ?? 0) > 0
              ? <ShieldAlert size={17} className="text-red-600" aria-hidden="true" />
              : <CheckCircle2 size={17} className="text-emerald-600" aria-hidden="true" />}
          </div>
          <div>
            <h2 className="text-[13px] font-semibold tracking-tight text-text-main">Risk indicators</h2>
            <p className="text-[11px] text-text-muted">Detected from live data — payments, schedules, staffing, vendors, audit trail</p>
          </div>
        </div>
        {summary && total > 0 && (
          <div className="flex items-center gap-1.5" aria-label="Risk counts by severity">
            <Badge variant="destructive">{summary.high} high</Badge>
            <Badge variant="warning">{summary.medium} medium</Badge>
            <Badge variant="secondary">{summary.low} low</Badge>
          </div>
        )}
      </div>

      <div className="space-y-0.5 p-3">
        {isLoading && (
          <div className="space-y-2 p-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-border/30" />)}</div>
        )}
        {!isLoading && risks.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 size={22} className="text-emerald-500" aria-hidden="true" />
            <p className="text-[12px] text-text-muted">No risks detected. Everything is on track.</p>
          </div>
        )}
        {risks.map((r) => <RiskRow key={r.id} risk={r} />)}
      </div>

      {!isLoading && total > risks.length && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-[12px] text-text-muted">Showing the top {risks.length} of {total}</p>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>View all {total}</Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Risk register</DialogTitle></DialogHeader>
          {register.isLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-text-muted">
              <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Checking live data…
            </div>
          )}
          {register.isError && <p role="alert" className="py-6 text-center text-[13px] text-red-600">Couldn’t load the risk register.</p>}
          {register.data && (
            <div className="space-y-0.5">
              {register.data.cappedKinds.length > 0 && (
                <p className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-700">
                  Some rules found more than {200} matches; their counts are a minimum.
                </p>
              )}
              {register.data.items.map((r) => <RiskRow key={r.id} risk={r} />)}
              {register.data.items.length === 0 && <p className="py-6 text-center text-[13px] text-text-muted">No risks detected.</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
