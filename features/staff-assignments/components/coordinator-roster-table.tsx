// features/staff-assignments/components/coordinator-roster-table.tsx
"use client"

import { useRouter } from "next/navigation"
import { useCoordinatorRoster } from "@/features/staff-assignments"
import { Badge } from "@/components/ui/badge"
import { Users, ChevronRight, CalendarDays } from "lucide-react"

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: "Wedding", DEBUT: "Debut", CORPORATE: "Corporate Event",
  BIRTHDAY: "Birthday", OTHER: "Event",
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })

/**
 * FR-36 — Coordinator roster: every COORDINATOR-role user with their
 * upcoming assignment load and next assignment. Read-only overview —
 * actual assignment happens from the booking detail page.
 */
export function CoordinatorRosterTable() {
  const router = useRouter()
  const { data: roster, isLoading, isError } = useCoordinatorRoster()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl border border-border bg-white animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-[13px] text-red-600">
        Failed to load coordinator roster.
      </div>
    )
  }

  if (!roster || roster.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background-blush p-12 text-center">
        <Users size={26} className="text-primary" aria-hidden="true" />
        <p className="text-[14px] font-semibold text-text-main">No coordinators yet</p>
        <p className="text-[13px] text-text-muted">
          Coordinator accounts are created by an administrator under User accounts.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border">
      {roster.map((c) => (
        <button
          key={c.id}
          onClick={() => c.nextAssignment && router.push(`/staff/admin/bookings/${c.nextAssignment.bookingId}`)}
          disabled={!c.nextAssignment}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-primary-soft/20 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary">
              {c.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold text-text-main truncate">{c.fullName}</p>
                {!c.isActive && <Badge variant="muted" className="text-[10px]">Inactive</Badge>}
              </div>
              {c.nextAssignment ? (
                <p className="flex items-center gap-1 text-[11px] text-text-muted mt-0.5">
                  <CalendarDays size={10} aria-hidden="true" />
                  Next: {EVENT_TYPE_LABELS[c.nextAssignment.eventType] ?? c.nextAssignment.eventType}
                  {" "}· {fmtDate(c.nextAssignment.eventDate)}
                </p>
              ) : (
                <p className="text-[11px] text-text-muted mt-0.5">No upcoming assignments</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary">
              {c.upcomingCount} upcoming
            </Badge>
            {c.nextAssignment && <ChevronRight size={14} className="text-text-muted" aria-hidden="true" />}
          </div>
        </button>
      ))}
    </div>
  )
}
