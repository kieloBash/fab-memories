// app/(pages)/(protected)/staff/coordinator/page.tsx
"use client"

/**
 * Coordinator dashboard — replaces the original scaffold, which showed
 * three stat cards permanently hard-coded to "—" with zero data wiring.
 * Deliberately a scoped-down mirror of what the Admin dashboard should
 * look like: same "needs attention" pattern, narrower data (their own
 * assignments + payments they now have authority to act on, per the
 * payment-authority extension).
 */

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  useMyDashboardSummary,
  STAFF_TASK_ROLE_LABELS,
  STAFF_TASK_ROLE_ICONS,
} from "@/features/staff-assignments"
import { usePayments, PAYMENT_METHOD_LABELS } from "@/features/payments"
import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import {
  ClipboardList, CalendarClock, AlertTriangle, CreditCard,
  ChevronRight, MapPin, Shield, CalendarRange,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SPRING } from "@/lib/framer/framer-utils"

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: "Wedding", DEBUT: "Debut", CORPORATE: "Corporate Event",
  BIRTHDAY: "Birthday", OTHER: "Event",
}

const fmt = (n: string | number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(Number(n))

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

export default function CoordinatorDashboardPage() {
  const router = useRouter()

  const { data: summary, isLoading: summaryLoading } = useMyDashboardSummary()
  const { data: submittedPayments, isLoading: paymentsLoading } = usePayments({ status: "SUBMITTED" })

  const stats = [
    {
      label: "My upcoming events",
      value: summary?.upcomingCount ?? "—",
      icon: ClipboardList,
    },
    {
      label: "This week",
      value: summary?.thisWeekCount ?? "—",
      icon: CalendarClock,
    },
    {
      label: "My events understaffed",
      value: summary?.understaffedCount ?? "—",
      icon: AlertTriangle,
      warn: (summary?.understaffedCount ?? 0) > 0,
    },
    {
      label: "Payments to review",
      value: submittedPayments?.length ?? "—",
      icon: CreditCard,
      warn: (submittedPayments?.length ?? 0) > 0,
    },
  ]

  return (
    <motion.div
      variants={containerVariants} initial="hidden" animate="visible"
      className="flex flex-col gap-6"
    >
      <motion.div variants={itemVariants}>
        <PageHeader
          title="Dashboard"
          subtitle="Event Coordinator"
          icon={ClipboardList}
        />
      </motion.div>

      {/* ── Stat cards ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "bg-white border rounded-xl p-5 flex flex-col gap-2 transition-all hover:-translate-y-0.5 hover:shadow-card-hover",
              stat.warn ? "border-amber-200" : "border-border",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                {stat.label}
              </p>
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                stat.warn ? "bg-amber-50" : "bg-primary-soft",
              )}>
                <stat.icon size={15} className={stat.warn ? "text-amber-600" : "text-primary"} aria-hidden="true" />
              </div>
            </div>
            <p className={cn(
              "text-[26px] font-bold tracking-tighter leading-none",
              stat.warn ? "text-amber-600" : "text-text-main",
            )}>
              {stat.value}
            </p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── My upcoming events ── */}
        <motion.div variants={itemVariants} className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-[13px] font-semibold tracking-tight text-text-main">My upcoming events</p>
            <button
              onClick={() => router.push("/staff/coordinator/staff")}
              className="text-[12px] font-medium text-primary hover:underline"
            >
              View all
            </button>
          </div>

          <div className="p-3 space-y-2">
            {summaryLoading && (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-border/30 animate-pulse" />)}
              </div>
            )}

            {!summaryLoading && (!summary || summary.upcoming.length === 0) && (
              <p className="py-6 text-center text-[12px] text-text-muted">
                No upcoming assignments.
              </p>
            )}

            {summary?.upcoming.map((a) => (
              <button
                key={a.id}
                onClick={() => router.push(`/staff/coordinator/bookings/${a.booking.id}`)}
                className="w-full flex items-center justify-between gap-3 rounded-lg p-3 text-left hover:bg-primary-soft/20 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[13px] font-semibold text-text-main">
                      {EVENT_TYPE_LABELS[a.booking.eventType] ?? a.booking.eventType}
                    </p>
                    {a.isBackup && (
                      <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft px-1.5 py-0.5 text-[9px] font-medium text-primary">
                        <Shield size={8} aria-hidden="true" /> Backup
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-text-muted mt-0.5">
                    <MapPin size={9} aria-hidden="true" />
                    <span className="truncate">{a.booking.venue}</span>
                  </div>
                  <Badge variant="secondary" className="mt-1.5 text-[10px]">
                    {STAFF_TASK_ROLE_ICONS[a.taskRole]} {STAFF_TASK_ROLE_LABELS[a.taskRole]}
                  </Badge>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-medium text-text-sub">{fmtDate(a.booking.eventDate)}</p>
                  <ChevronRight size={14} className="text-text-muted ml-auto mt-1" aria-hidden="true" />
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Payments awaiting review ── */}
        <motion.div variants={itemVariants} className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-[13px] font-semibold tracking-tight text-text-main">Payments awaiting review</p>
            <button
              onClick={() => router.push("/staff/coordinator/payments")}
              className="text-[12px] font-medium text-primary hover:underline"
            >
              View all
            </button>
          </div>

          <div className="p-3 space-y-2">
            {paymentsLoading && (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-border/30 animate-pulse" />)}
              </div>
            )}

            {!paymentsLoading && (!submittedPayments || submittedPayments.length === 0) && (
              <p className="py-6 text-center text-[12px] text-text-muted">
                Nothing waiting on review right now.
              </p>
            )}

            {submittedPayments?.slice(0, 5).map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/staff/coordinator/payments/${p.id}`)}
                className="w-full flex items-center justify-between gap-3 rounded-lg p-3 text-left hover:bg-primary-soft/20 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text-main">{p.booking.client.fullName}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {PAYMENT_METHOD_LABELS[p.method]}
                    {p.referenceNumber && ` · ${p.referenceNumber}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold text-text-main">{fmt(p.amount)}</p>
                  <ChevronRight size={14} className="text-text-muted ml-auto mt-1" aria-hidden="true" />
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Calendar link ── */}
      <motion.button
        variants={itemVariants}
        onClick={() => router.push("/staff/coordinator/calendar")}
        className="flex items-center justify-between rounded-xl border border-border bg-white p-4 hover:-translate-y-0.5 hover:shadow-card-hover hover:border-border-strong transition-all text-left w-full"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft">
            <CalendarRange size={16} className="text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-text-main">View staffing calendar</p>
            <p className="text-[11px] text-text-muted">See every event's staffing status at a glance</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-text-muted shrink-0" aria-hidden="true" />
      </motion.button>
    </motion.div>
  )
}
