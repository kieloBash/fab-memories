// app/(pages)/(protected)/portal/page.tsx
"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useBookings, EVENT_TYPE_LABELS } from "@/features/bookings"
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import {
  CalendarHeart, Clock, CalendarDays, FileText,
  Plus, ChevronRight, Sparkles,
} from "lucide-react"
import { SPRING } from "@/lib/framer/framer-utils"

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })

/**
 * FIX: this page previously rendered 4 stat cards that were always
 * "—" — hard-coded placeholder values with no data wiring at all.
 * It now pulls the client's real bookings/payments and derives:
 *   - their most relevant active booking's status
 *   - days remaining until that event
 *   - next payment due (if terms are set and deposit isn't verified)
 * With zero bookings, it shows a proper empty state + CTA instead of
 * four dashes, which is a much clearer signal than "the data failed
 * to load."
 */
export default function ClientPortalPage() {
  const router = useRouter()
  const { data: bookings, isLoading } = useBookings()

  const activeBooking = useMemo(() => {
    if (!bookings || bookings.length === 0) return null
    // Prefer a CONFIRMED booking with the soonest upcoming date;
    // fall back to the most recently created PENDING booking.
    const confirmed = bookings
      .filter((b) => b.status === "CONFIRMED" && new Date(b.eventDate) >= new Date())
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    if (confirmed.length > 0) return confirmed[0]

    const pending = bookings
      .filter((b) => b.status === "PENDING")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return pending[0] ?? bookings[0]
  }, [bookings])

  const daysToEvent = useMemo(() => {
    if (!activeBooking) return null
    const diff = Math.ceil(
      (new Date(activeBooking.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )
    return diff >= 0 ? diff : null
  }, [activeBooking])

  const depositVerified = activeBooking?.payments?.some(
    (p) => p.paymentType === "DEPOSIT" && p.status === "VERIFIED",
  )
  const termsSet = !!(activeBooking?.paymentPlan && activeBooking?.depositAmount)

  const nextPaymentLabel = !activeBooking
    ? "—"
    : !termsSet
      ? "Awaiting terms"
      : depositVerified
        ? "Up to date"
        : "Deposit due"

  const stats = [
    {
      label: "Booking status",
      value: activeBooking ? undefined : "—",
      badge: activeBooking ? <BookingStatusBadge status={activeBooking.status} /> : null,
      icon: CalendarHeart,
    },
    {
      label: "Next payment",
      value: nextPaymentLabel,
      icon: Clock,
    },
    {
      label: "Days to event",
      value: daysToEvent !== null ? daysToEvent : "—",
      icon: CalendarDays,
    },
    {
      label: "Documents ready",
      value: 0,
      icon: FileText,
    },
  ]

  return (
    <motion.div
      variants={containerVariants} initial="hidden" animate="visible"
      className="flex flex-col gap-6"
    >
      <motion.div variants={itemVariants}>
        <PageHeader
          title="My booking"
          subtitle="Client portal"
          icon={CalendarHeart}
          actions={
            <Button onClick={() => router.push("/portal/bookings/new")}>
              <Plus size={14} aria-hidden="true" /> New booking
            </Button>
          }
        />
      </motion.div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-border bg-white animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && !activeBooking && (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center gap-5 rounded-xl border border-border bg-background-blush p-16 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center">
            <Sparkles size={28} className="text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[16px] font-semibold tracking-tight text-text-main">
              No bookings yet
            </p>
            <p className="text-[13px] text-text-muted mt-1 max-w-xs">
              Once you submit a booking request, your status, payments, and documents will appear here.
            </p>
          </div>
          <Button onClick={() => router.push("/portal/bookings/new")}>
            <Plus size={15} aria-hidden="true" /> Request a booking
          </Button>
        </motion.div>
      )}

      {!isLoading && activeBooking && (
        <>
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white border border-border rounded-xl p-5 flex flex-col gap-2 transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                    {stat.label}
                  </p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft">
                    <stat.icon size={15} className="text-primary" aria-hidden="true" />
                  </div>
                </div>
                {stat.badge ?? (
                  <p className="text-[26px] font-bold tracking-tighter text-text-main leading-none">
                    {stat.value}
                  </p>
                )}
              </div>
            ))}
          </motion.div>

          <motion.button
            variants={itemVariants}
            onClick={() => router.push(`/portal/bookings/${activeBooking.id}`)}
            className="flex items-center justify-between rounded-xl border border-border bg-white p-5 hover:-translate-y-0.5 hover:shadow-card-hover hover:border-border-strong transition-all text-left w-full"
          >
            <div className="min-w-0">
              <p className="text-[14px] font-semibold tracking-tight text-text-main">
                {EVENT_TYPE_LABELS[activeBooking.eventType]}
              </p>
              <p className="text-[12px] text-text-muted mt-0.5">
                {fmtDate(activeBooking.eventDate)} · {activeBooking.venue}
              </p>
            </div>
            <ChevronRight size={16} className="text-text-muted shrink-0" aria-hidden="true" />
          </motion.button>
        </>
      )}
    </motion.div>
  )
}
