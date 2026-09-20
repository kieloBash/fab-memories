// features/reports/components/recent-audit-feed.tsx
"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { humanize } from "../reports.format"
import type { RecentAuditItem } from "../reports.types"

/** FR-58 — latest business activity from the audit trail (report views are excluded). */
export function RecentAuditFeed({ items, isLoading }: { items: RecentAuditItem[]; isLoading: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white" data-testid="audit-feed">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight text-text-main">Recent activity</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">Latest entries in the tamper-evident audit trail</p>
        </div>
        <Link href="/staff/admin/audit" className="text-[12px] font-medium text-primary hover:underline">Open audit trail</Link>
      </div>
      <ul className="divide-y divide-border">
        {isLoading && [1, 2, 3, 4].map((i) => <li key={i} className="p-4"><div className="h-4 animate-pulse rounded-full bg-border/30" /></li>)}
        {!isLoading && items.length === 0 && <li className="py-8 text-center text-[12px] text-text-muted">No activity recorded yet.</li>}
        {items.map((e) => (
          <li key={e.id} className="flex items-start gap-3 px-5 py-3">
            <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", e.status === "FAILURE" ? "bg-red-50" : "bg-primary-soft")}>
              {e.status === "FAILURE"
                ? <AlertTriangle size={13} className="text-red-600" aria-hidden="true" />
                : <ShieldCheck size={13} className="text-primary" aria-hidden="true" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] leading-snug text-text-main">{e.description}</p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {humanize(e.module)} · {humanize(e.action)} · {e.userName ?? "System"} · {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
              </p>
            </div>
            <span className="font-mono text-[10px] text-text-muted">#{e.sequence}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
