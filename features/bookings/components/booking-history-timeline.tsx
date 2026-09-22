// features/bookings/components/booking-history-timeline.tsx
"use client"

import {
  Ban, CalendarCheck, CalendarClock, CalendarX, CircleDollarSign,
  FileEdit, FileText, Flag, History, Loader2, ShieldCheck, Wallet, XCircle,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useBookingHistory } from "../booking-history.hooks"
import type { BookingHistoryEvent, BookingHistoryKind } from "../booking-history.types"
import { cn } from "@/lib/utils"

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", COORDINATOR: "Coordinator", CLIENT: "You", VENDOR: "Vendor" }

const ICON: Record<BookingHistoryKind, { icon: LucideIcon; cls: string }> = {
  requested:               { icon: FileText,        cls: "text-text-muted" },
  edited:                  { icon: FileEdit,         cls: "text-text-muted" },
  terms_updated:           { icon: FileEdit,         cls: "text-primary" },
  cancellation_requested:  { icon: CalendarClock,     cls: "text-amber-600" },
  cancellation_declined:   { icon: ShieldCheck,       cls: "text-emerald-600" },
  confirmed:                { icon: CalendarCheck,     cls: "text-emerald-600" },
  cancelled:                { icon: CalendarX,         cls: "text-red-600" },
  withdrawn:                { icon: Ban,               cls: "text-red-600" },
  deposit_submitted:        { icon: Wallet,            cls: "text-text-muted" },
  deposit_verified:         { icon: CircleDollarSign,  cls: "text-emerald-600" },
  balance_submitted:        { icon: Wallet,            cls: "text-text-muted" },
  balance_verified:         { icon: CircleDollarSign,  cls: "text-emerald-600" },
  installment_submitted:    { icon: Wallet,            cls: "text-text-muted" },
  installment_verified:     { icon: CircleDollarSign,  cls: "text-emerald-600" },
  payment_flagged:          { icon: Flag,              cls: "text-amber-600" },
  other:                    { icon: History,           cls: "text-text-muted" },
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })
}

function Row({ event, isLast }: { event: BookingHistoryEvent; isLast: boolean }) {
  const { icon: Icon, cls } = ICON[event.kind]
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!isLast && <span className="absolute left-[13px] top-6 h-full w-px bg-border" aria-hidden="true" />}
      <span className={cn("relative z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-border bg-white", cls)}>
        <Icon size={13} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[13px] font-medium text-text-main">{event.label}</p>
        <p className="text-[11px] text-text-muted">
          {when(event.at)}{event.actorRole ? ` · ${ROLE_LABEL[event.actorRole] ?? event.actorRole}` : ""}
        </p>
      </div>
    </li>
  )
}

/** A chronological timeline of what happened to a booking, built from the audit trail (FR-13). */
export function BookingHistoryTimeline({ bookingId }: { bookingId: string }) {
  const { data, isLoading, isError } = useBookingHistory(bookingId)

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
        <History size={12} aria-hidden="true" /> Status history
      </p>

      {isLoading && (
        <div className="flex items-center gap-2 py-4 text-[12px] text-text-muted">
          <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Loading history…
        </div>
      )}
      {isError && (
        <div className="flex items-center gap-2 py-4 text-[12px] text-red-600">
          <XCircle size={13} aria-hidden="true" /> Couldn't load the history.
        </div>
      )}
      {data && data.length === 0 && <p className="py-2 text-[12px] text-text-muted">No history yet.</p>}
      {data && data.length > 0 && (
        <ol>
          {data.map((event, i) => <Row key={event.id} event={event} isLast={i === data.length - 1} />)}
        </ol>
      )}
    </div>
  )
}
