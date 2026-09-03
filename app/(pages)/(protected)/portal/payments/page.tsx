// app/(pages)/(protected)/portal/payments/page.tsx
"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useBookings } from "@/features/bookings"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge"
import { EVENT_TYPE_LABELS } from "@/features/bookings"
import { CreditCard, ChevronRight, CalendarHeart } from "lucide-react"
import { SPRING } from "@/lib/framer/framer-utils"

/**
 * Payments are scoped to a specific booking (each event has its own
 * deposit/installments/balance) rather than a single global payments
 * list, so this page acts as a router: show the client's bookings and
 * let them jump straight into that booking's payment screen.
 */
export default function ClientPaymentsLandingPage() {
  const router = useRouter()
  const { data: bookings, isLoading } = useBookings()

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="Payments"
        subtitle="Select a booking to view its payment status"
        icon={CreditCard}
      />

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-border bg-white animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!bookings || bookings.length === 0) && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-background-blush p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-soft flex items-center justify-center">
            <CalendarHeart size={26} className="text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-text-main">No bookings yet</p>
            <p className="text-[13px] text-text-muted mt-1">
              Payments appear here once you have an active booking.
            </p>
          </div>
          <Button onClick={() => router.push("/portal/bookings/new")}>Request a booking</Button>
        </div>
      )}

      {bookings && bookings.length > 0 && (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => (
            <button
              key={b.id}
              onClick={() => router.push(`/portal/bookings/${b.id}/payment`)}
              className="flex items-center justify-between rounded-xl border border-border bg-white p-4 hover:-translate-y-0.5 hover:shadow-card-hover hover:border-border-strong transition-all text-left w-full"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
                  <CreditCard size={16} className="text-primary" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-semibold text-text-main">
                      {EVENT_TYPE_LABELS[b.eventType]}
                    </p>
                    <BookingStatusBadge status={b.status} />
                  </div>
                  <p className="text-[12px] text-text-muted mt-0.5">{fmtDate(b.eventDate)}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-text-muted shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}
