// features/staff-assignments/components/my-assignments-list.tsx
"use client"

import { useRouter } from "next/navigation"
import { useMyAssignments, STAFF_TASK_ROLE_LABELS, STAFF_TASK_ROLE_ICONS } from "@/features/staff-assignments"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, ChevronRight, Shield, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: "Wedding", DEBUT: "Debut", CORPORATE: "Corporate Event",
  BIRTHDAY: "Birthday", OTHER: "Event",
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING:   "border-amber-200 bg-amber-50 text-amber-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-600",
  CANCELLATION_REQUESTED: "border-orange-200 bg-orange-50 text-orange-700",
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" })

/**
 * Self-service view for the signed-in coordinator — the digital
 * replacement for "plotting from the available roster" manually.
 * Shown as a "My assignments" section on the coordinator's own
 * Staff scheduling page.
 */
export function MyAssignmentsList() {
  const router = useRouter()
  const { data: assignments, isLoading, isError } = useMyAssignments()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-white animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-[13px] text-red-600">
        Failed to load your assignments.
      </div>
    )
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background-blush p-10 text-center">
        <ClipboardList size={24} className="text-primary" aria-hidden="true" />
        <p className="text-[13px] font-semibold text-text-main">No assignments yet</p>
        <p className="text-[12px] text-text-muted">
          Events you're staffed on will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {assignments.map((a) => (
        <button
          key={a.id}
          onClick={() => router.push(`/staff/coordinator/bookings/${a.booking.id}`)}
          className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-4 text-left hover:-translate-y-0.5 hover:shadow-card-hover hover:border-border-strong transition-all"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[13px] font-semibold text-text-main">
                {EVENT_TYPE_LABELS[a.booking.eventType] ?? a.booking.eventType}
              </p>
              <span className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                STATUS_COLORS[a.booking.status] ?? "border-border bg-background-blush text-text-muted",
              )}>
                {a.booking.status.replace("_", " ")}
              </span>
              {a.isBackup && (
                <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">
                  <Shield size={9} aria-hidden="true" /> Backup
                </span>
              )}
            </div>
            <p className="text-[12px] text-text-muted mt-1">{fmtDate(a.booking.eventDate)}</p>
            <div className="flex items-center gap-1 text-[11px] text-text-muted mt-0.5">
              <MapPin size={10} aria-hidden="true" />
              <span className="truncate">{a.booking.venue}</span>
            </div>
            <Badge variant="secondary" className="mt-2 text-[10px]">
              {STAFF_TASK_ROLE_ICONS[a.taskRole]} {STAFF_TASK_ROLE_LABELS[a.taskRole]}
            </Badge>
          </div>
          <ChevronRight size={16} className="text-text-muted shrink-0" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
