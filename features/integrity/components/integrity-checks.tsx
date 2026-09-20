// features/integrity/components/integrity-checks.tsx
"use client"

import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert, ShieldCheck, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getApiErrorMessage } from "@/lib/axios"
import { cn } from "@/lib/utils"
import { useIntegrityReport } from "../integrity.hooks"
import type { CheckStatus, IntegrityCheck } from "../integrity.types"

const STYLE: Record<CheckStatus, { icon: typeof CheckCircle2; card: string; iconCls: string; label: string; pill: string }> = {
  pass: { icon: CheckCircle2,  card: "border-emerald-200", iconCls: "text-emerald-600", label: "Pass",    pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  warn: { icon: AlertTriangle, card: "border-amber-200",   iconCls: "text-amber-600",   label: "Warning", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  fail: { icon: XCircle,       card: "border-red-200",     iconCls: "text-red-600",     label: "Fail",    pill: "bg-red-50 text-red-600 border-red-200" },
}

function CheckCard({ check }: { check: IntegrityCheck }) {
  const s = STYLE[check.status]
  const Icon = s.icon
  return (
    <section className={cn("rounded-xl border bg-white p-5", s.card)} data-testid={`check-${check.id}`} data-status={check.status}>
      <div className="flex items-start gap-3">
        <Icon size={20} className={cn("mt-0.5 shrink-0", s.iconCls)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[14px] font-semibold tracking-tight text-text-main">{check.title}</h2>
            <span className={cn("rounded-pill border px-2 py-0.5 text-[10px] font-semibold", s.pill)}>{s.label}</span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-text-sub">{check.summary}</p>
          {check.detail.length > 0 && (
            <ul className="mt-2 space-y-1">
              {check.detail.map((d, i) => <li key={i} className="text-[12px] text-text-muted">• {d}</li>)}
            </ul>
          )}
          {check.remedy && (
            <p className="mt-3 rounded-lg bg-background-blush p-3 text-[12px] leading-relaxed text-text-sub">
              <strong className="font-semibold text-text-main">What to do: </strong>{check.remedy}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

/** The system-integrity panel: overall verdict + one card per live check. */
export function IntegrityChecks() {
  const { data, isLoading, isFetching, error, refetch } = useIntegrityReport()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {data ? (
          <div className={cn("flex items-center gap-3 rounded-xl border px-4 py-3",
            data.overall === "pass" ? "border-emerald-200 bg-emerald-50" : data.overall === "warn" ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50")}
            data-testid="overall" data-status={data.overall}>
            {data.overall === "pass" ? <ShieldCheck size={20} className="text-emerald-600" aria-hidden="true" /> : <ShieldAlert size={20} className={data.overall === "warn" ? "text-amber-600" : "text-red-600"} aria-hidden="true" />}
            <div>
              <p className="text-[13px] font-semibold text-text-main">
                {data.overall === "pass" ? "All integrity checks pass" : data.overall === "warn" ? "Passing, with warnings" : "Integrity problems found"}
              </p>
              <p className="text-[11px] text-text-muted">
                {data.checks.filter((c) => c.status === "pass").length} of {data.checks.length} passing · database role “{data.database.role}” · checked {new Date(data.generatedAt).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila" })}
              </p>
            </div>
          </div>
        ) : <div />}
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={13} aria-hidden="true" />}
          {isFetching ? "Checking…" : "Run checks again"}
        </Button>
      </div>

      {isLoading && <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-border/30" />)}</div>}
      {error && !data && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{getApiErrorMessage(error)}</p>}
      {data?.checks.map((c) => <CheckCard key={c.id} check={c} />)}
    </div>
  )
}
