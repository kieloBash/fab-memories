// features/bookings/components/booking-card.tsx
"use client"

import { cn } from "@/lib/utils"
import {
  AlertCircle, CalendarDays, CheckCircle2,
  Clock, CreditCard, MapPin, Users,
} from "lucide-react"
import { EVENT_TYPE_LABELS } from "../bookings.constants"
import type { BookingWithRelations } from "../bookings.types"
import { BookingStatusBadge } from "./booking-status-badge"

interface BookingCardProps {
  booking: BookingWithRelations
  onClick?: () => void
}

function PaymentProgressPill({ booking }: { booking: BookingWithRelations }) {
  const payments = booking.payments
  const installments = (booking as any).installments as Array<{ status: string }> | undefined

  if (!payments) return null

  const deposit = payments
    .filter((p) => p.paymentType === "DEPOSIT")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  if (!deposit) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-pill px-2.5 py-1">
        <Clock size={11} aria-hidden="true" />
        Deposit required
      </div>
    )
  }

  if (deposit.status === "SUBMITTED") {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-pill px-2.5 py-1">
        <Clock size={11} aria-hidden="true" />
        Awaiting verification
      </div>
    )
  }

  if (deposit.status === "FLAGGED") {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-pill px-2.5 py-1">
        <AlertCircle size={11} aria-hidden="true" />
        Deposit flagged
      </div>
    )
  }

  if (deposit.status === "VERIFIED" && installments) {
    const total = installments.length
    const paid = installments.filter((i) => i.status === "PAID").length

    if (total === 0) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-pill px-2.5 py-1">
          <CheckCircle2 size={11} aria-hidden="true" />
          Deposit verified
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-pill px-2.5 py-1">
        <CreditCard size={11} aria-hidden="true" />
        {paid}/{total} installments paid
      </div>
    )
  }

  return null
}

export function BookingCard({ booking, onClick }: BookingCardProps) {
  const eventDate = new Date(booking.eventDate).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  })

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency", currency: "PHP", minimumFractionDigits: 0,
    }).format(n)

  // Always use agreedPrice — the price locked at booking time
  const displayPrice = Number(booking.agreedPrice)

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-white p-5",
        "transition-all duration-200",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover hover:border-border-strong",
      )}
    >
      {/* Blush gradient on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: "linear-gradient(135deg, rgba(245,100,169,0.03) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-tight text-text-main leading-tight truncate">
            {EVENT_TYPE_LABELS[booking.eventType]}
          </p>
          <p className="text-[12px] text-text-muted mt-0.5 truncate">{booking.package.name}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Details */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[13px] text-text-sub">
          <CalendarDays size={14} className="text-text-muted shrink-0" aria-hidden="true" />
          <span>{eventDate}</span>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-text-sub">
          <MapPin size={14} className="text-text-muted shrink-0" aria-hidden="true" />
          <span className="truncate">{booking.venue}</span>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-text-sub">
          <Users size={14} className="text-text-muted shrink-0" aria-hidden="true" />
          <span>{booking.guestCount} guests</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-text-main">
            {fmt(displayPrice)}
          </span>
          {/* Provincial badge if applicable */}
          {booking.isProvincial && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-pill px-2 py-0.5">
              Provincial
            </span>
          )}
        </div>
        <PaymentProgressPill booking={booking} />
      </div>
    </div>
  )
}
