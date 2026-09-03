// app/(pages)/(protected)/staff/admin/bookings/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useBookings, EVENT_TYPE_LABELS, BOOKING_STATUS_LABELS } from "@/features/bookings"
import { BookingCard } from "@/features/bookings/components/booking-card"
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  CalendarDays, LayoutGrid, ChevronLeft, ChevronRight,
  AlertCircle,
} from "lucide-react"
import type { BookingStatus } from "@/app/generated/prisma/client"
import { cn } from "@/lib/utils"
import { SPRING } from "@/lib/framer/framer-utils"

type ViewMode = "grid" | "calendar"

// ── Calendar helpers ──────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

const STATUS_DOT: Record<BookingStatus, string> = {
  PENDING:                "bg-amber-400",
  CONFIRMED:              "bg-emerald-400",
  CANCELLED:              "bg-red-400",
  CANCELLATION_REQUESTED: "bg-orange-400",
}

// ── Component ─────────────────────────────────────────────────

export default function AdminBookingsPage() {
  const router  = useRouter()
  const today   = new Date()

  const [status, setStatus]   = useState<BookingStatus | undefined>()
  const [view, setView]       = useState<ViewMode>("grid")
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  const { data: bookings, isLoading, isError } = useBookings(status ? { status } : undefined)

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11) }
    else setCalMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0) }
    else setCalMonth((m) => m + 1)
  }

  // Build day-to-bookings map for the calendar
  const bookingsByDay: Record<number, typeof bookings> = {}
  if (bookings) {
    for (const b of bookings) {
      const d = new Date(b.eventDate)
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate()
        if (!bookingsByDay[day]) bookingsByDay[day] = []
        bookingsByDay[day]!.push(b)
      }
    }
  }

  const daysInMonth   = getDaysInMonth(calYear, calMonth)
  const firstDay      = getFirstDayOfMonth(calYear, calMonth)
  const calendarCells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1,
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="Bookings"
        subtitle="Manage all event booking requests"
        icon={CalendarDays}
        actions={
          <div className="flex items-center gap-2">
            {/* Status filter */}
            <Select
              value={status ?? "ALL"}
              onValueChange={(v) => setStatus(v === "ALL" ? undefined : (v as BookingStatus))}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{BOOKING_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/*
              FIX: toggle switched instantly with a flat color swap and no
              animation, which read as "did that even register?" on click.
              Now uses a shared layoutId pill that slides between the two
              options (same pattern as the sidebar's active-link indicator),
              plus shadow-primary-sm (now defined) on the active segment.
            */}
            <div className="relative flex rounded-xl border border-border overflow-hidden bg-white">
              {(["grid", "calendar"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "relative z-10 flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors duration-150",
                    view === v ? "text-white" : "text-text-sub hover:bg-background-blush",
                  )}
                >
                  {view === v && (
                    <motion.span
                      layoutId="bookings-view-toggle"
                      className="absolute inset-0 -z-10 bg-primary shadow-primary-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      aria-hidden="true"
                    />
                  )}
                  {v === "grid"
                    ? <><LayoutGrid size={13} aria-hidden="true" /> Grid</>
                    : <><CalendarDays size={13} aria-hidden="true" /> Calendar</>}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-xl border border-border bg-white animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-[13px] text-red-600 flex items-center gap-2">
          <AlertCircle size={15} aria-hidden="true" />
          Failed to load bookings. Please refresh and try again.
        </div>
      )}

      {/* ── Grid view ── */}
      {!isLoading && !isError && view === "grid" && (
        <>
          {bookings && bookings.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bookings.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onClick={() => router.push(`/staff/admin/bookings/${b.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background-blush p-12 text-center">
              <p className="text-[14px] font-semibold text-text-main">No bookings found</p>
              <p className="text-[13px] text-text-muted mt-1">
                {status ? `No bookings with status "${BOOKING_STATUS_LABELS[status]}"` : "No bookings yet"}
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Calendar view (FR-16) ── */}
      {!isLoading && !isError && view === "calendar" && (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          {/* Calendar header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-[15px] font-semibold tracking-tight text-text-main">
              {MONTH_NAMES[calMonth]} {calYear}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
                <ChevronLeft size={15} aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()) }}
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
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border bg-background-blush">
            {(["PENDING", "CONFIRMED", "CANCELLED", "CANCELLATION_REQUESTED"] as BookingStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", STATUS_DOT[s])} />
                <span className="text-[11px] text-text-muted">{BOOKING_STATUS_LABELS[s]}</span>
              </div>
            ))}
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
          <div className="grid grid-cols-7">
            {calendarCells.map((day, idx) => {
              const isToday =
                day !== null &&
                today.getDate() === day &&
                today.getMonth() === calMonth &&
                today.getFullYear() === calYear
              const dayBookings = day ? (bookingsByDay[day] ?? []) : []

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[80px] border-b border-r border-border p-1.5",
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
                        {dayBookings.slice(0, 3).map((b) => (
                          <button
                            key={b.id}
                            onClick={() => router.push(`/staff/admin/bookings/${b.id}`)}
                            className="w-full flex items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-primary-soft/40 transition-colors"
                          >
                            <div className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[b.status])} />
                            <span className="text-[10px] text-text-sub truncate">
                              {EVENT_TYPE_LABELS[b.eventType]}
                            </span>
                          </button>
                        ))}
                        {dayBookings.length > 3 && (
                          <p className="text-[10px] text-text-muted pl-1">
                            +{dayBookings.length - 3} more
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}
