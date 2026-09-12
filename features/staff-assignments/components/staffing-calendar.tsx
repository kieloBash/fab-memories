// features/staff-assignments/components/staffing-calendar.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStaffingCalendar } from "@/features/staff-assignments"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Users, AlertTriangle, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: "Wedding", DEBUT: "Debut", CORPORATE: "Corporate",
  BIRTHDAY: "Birthday", OTHER: "Event",
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

interface StaffingCalendarProps {
  /** Where to send the user when they click an event — receives the bookingId */
  bookingHref: (bookingId: string) => string
}

/**
 * Month-grid calendar showing every event's FR-37 staffing status at a
 * glance:
 *   green  — fully staffed (assignedCount within the recommended band)
 *   amber  — understaffed (assigned but below the recommended minimum)
 *   gray   — no coordinators assigned yet
 *
 * This is the calendar analogue of the per-booking staffing banner —
 * same compliance logic, just surfaced across a whole month so gaps
 * (like Anna's Debut / Ben's Birthday sharing a date in the seed data)
 * are visible without opening each booking individually.
 */
export function StaffingCalendar({ bookingHref }: StaffingCalendarProps) {
  const router = useRouter()
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const { data: entries, isLoading } = useStaffingCalendar(year, month)

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  const byDay: Record<number, typeof entries> = {}
  if (entries) {
    for (const e of entries) {
      const d = new Date(e.eventDate)
      const day = d.getUTCDate()
      if (!byDay[day]) byDay[day] = []
      byDay[day]!.push(e)
    }
  }

  const daysInMonth   = getDaysInMonth(year, month)
  const firstDay      = getFirstDayOfMonth(year, month)
  const calendarCells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1,
  )

  const statusColor = (isCompliant: boolean, assignedCount: number) => {
    if (assignedCount === 0) return "bg-border"
    return isCompliant ? "bg-emerald-400" : "bg-amber-400"
  }

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-text-main">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
            <ChevronLeft size={15} aria-hidden="true" />
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}
            className="text-[12px]"
          >
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
            <ChevronRight size={15} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border bg-background-blush flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] text-text-muted">Fully staffed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-[11px] text-text-muted">Below recommended</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-border" />
          <span className="text-[11px] text-text-muted">No staff assigned</span>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-text-muted">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      {isLoading ? (
        <div className="p-8 text-center text-[13px] text-text-muted">Loading calendar…</div>
      ) : (
        <div className="grid grid-cols-7">
          {calendarCells.map((day, idx) => {
            const isToday =
              day !== null &&
              today.getDate() === day &&
              today.getMonth() === month &&
              today.getFullYear() === year
            const dayEntries = day ? (byDay[day] ?? []) : []

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[92px] border-b border-r border-border p-1.5",
                  !day && "bg-background-blush/40",
                  idx % 7 === 6 && "border-r-0",
                )}
              >
                {day && (
                  <>
                    <span className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium",
                      isToday ? "bg-primary text-white font-bold" : "text-text-sub",
                    )}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEntries?.slice(0, 3).map((e) => (
                        <button
                          key={e.bookingId}
                          onClick={() => router.push(bookingHref(e.bookingId))}
                          title={`${e.coordinatorNames.length > 0 ? e.coordinatorNames.join(", ") : "No coordinators assigned"} · ${e.assignedCount}/${e.recommendation.min}–${e.recommendation.max} recommended`}
                          className="w-full flex items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-primary-soft/40 transition-colors"
                        >
                          <div className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            statusColor(e.isCompliant, e.assignedCount),
                          )} />
                          <span className="text-[10px] text-text-sub truncate">
                            {EVENT_TYPE_LABELS[e.eventType] ?? e.eventType}
                          </span>
                        </button>
                      ))}
                      {dayEntries && dayEntries.length > 3 && (
                        <p className="text-[10px] text-text-muted pl-1">
                          +{dayEntries.length - 3} more
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
