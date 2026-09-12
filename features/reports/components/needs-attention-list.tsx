// features/reports/components/needs-attention-list.tsx
"use client"

import { useRouter } from "next/navigation"
import { ClipboardList, CreditCard, XCircle, ChevronRight, CheckCircle2 } from "lucide-react"
import type { NeedsAttentionItem } from "@/features/reports"
import { cn } from "@/lib/utils"

interface NeedsAttentionListProps {
  items: NeedsAttentionItem[]
  isLoading?: boolean
}

const KIND_CONFIG: Record<NeedsAttentionItem["kind"], { icon: typeof ClipboardList; color: string; bg: string }> = {
  CONTRACT_TERMS:        { icon: ClipboardList, color: "text-primary",     bg: "bg-primary-soft" },
  PAYMENT_REVIEW:        { icon: CreditCard,    color: "text-amber-600",   bg: "bg-amber-50" },
  CANCELLATION_REQUEST:  { icon: XCircle,       color: "text-orange-600", bg: "bg-orange-50" },
}

/**
 * The single most useful thing an admin dashboard can do: replace
 * "checking 4 different pages" with one merged, click-through list —
 * pending contract terms, payments awaiting verification, and client
 * cancellation requests, sorted by recency.
 */
export function NeedsAttentionList({ items, isLoading }: NeedsAttentionListProps) {
  const router = useRouter()

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="text-[13px] font-semibold tracking-tight text-text-main">Needs attention</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {items.length > 0 ? `${items.length} item${items.length !== 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
      </div>

      <div className="p-3 space-y-1">
        {isLoading && (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-border/30 animate-pulse" />)}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 size={22} className="text-emerald-500" aria-hidden="true" />
            <p className="text-[12px] text-text-muted">Nothing needs your attention right now.</p>
          </div>
        )}

        {items.map((item, i) => {
          const config = KIND_CONFIG[item.kind]
          const Icon = config.icon
          return (
            <button
              key={`${item.kind}-${item.bookingId}-${i}`}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center gap-3 rounded-lg p-3 text-left hover:bg-primary-soft/20 transition-colors"
            >
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.bg)}>
                <Icon size={14} className={config.color} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-text-main truncate">{item.label}</p>
                <p className="text-[11px] text-text-muted truncate">{item.detail}</p>
              </div>
              <ChevronRight size={14} className="text-text-muted shrink-0" aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
