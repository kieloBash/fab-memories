// app/(pages)/(protected)/staff/admin/page.tsx
"use client"

/**
 * Admin Dashboard (FR-58) — rebuilt against a server-computed summary
 * (GET /api/reports/dashboard) instead of fetching every booking/payment
 * and filtering client-side, which is what the previous version did.
 * Adds the two things FR-58's "proactive risk mitigation" language
 * actually calls for and the old dashboard didn't have at all:
 * staffing compliance gaps (FR-37) and vendor coverage gaps (Module 4),
 * plus cancellation requests folded into one merged action list.
 */

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAdminDashboardSummary } from "@/features/reports"
import { NeedsAttentionList } from "@/features/reports/components/needs-attention-list"
import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard, CalendarDays, Clock, CreditCard,
  Users, Store, ChevronRight, MapPin,
} from "lucide-react"
import { cn } from "@/lib/utils"

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: "Wedding", DEBUT: "Debut", CORPORATE: "Corporate Event",
  BIRTHDAY: "Birthday", OTHER: "Event",
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { data: summary, isLoading } = useAdminDashboardSummary()

  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long", month: "long", day: "numeric",
  })

  const stats = [
    { label: "Active bookings",   value: summary?.activeBookingsCount,   icon: CalendarDays, href: "/staff/admin/bookings" },
    { label: "Pending requests",  value: summary?.pendingRequestsCount,  icon: Clock,        href: "/staff/admin/bookings" },
    { label: "Payments to verify",value: summary?.paymentsToVerifyCount, icon: CreditCard,   href: "/staff/admin/payments", warn: (summary?.paymentsToVerifyCount ?? 0) > 0 },
    { label: "Upcoming this week",value: summary?.upcomingThisWeekCount, icon: CalendarDays, href: "/staff/admin/bookings" },
  ]

  return (
    <motion.div
      variants={containerVariants} initial="hidden" animate="visible"
      className="flex flex-col gap-6"
    >
      <motion.div variants={itemVariants}>
        <PageHeader title="Dashboard" subtitle={today} icon={LayoutDashboard} />
      </motion.div>

      {/* ── Stat cards ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => router.push(stat.href)}
            className={cn(
              "bg-white border rounded-xl p-5 flex flex-col gap-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-card-hover",
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
              {isLoading ? "—" : stat.value}
            </p>
          </button>
        ))}
      </motion.div>

      {/* ── Compliance summary chips (staffing + vendor coverage) ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => router.push("/staff/admin/staff")}
          className={cn(
            "flex items-center justify-between rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-card-hover",
            (summary?.understaffedCount ?? 0) > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
              <Users size={16} className={(summary?.understaffedCount ?? 0) > 0 ? "text-amber-600" : "text-emerald-600"} aria-hidden="true" />
            </div>
            <div>
              <p className={cn("text-[13px] font-semibold", (summary?.understaffedCount ?? 0) > 0 ? "text-amber-700" : "text-emerald-700")}>
                {isLoading ? "Checking staffing…" : (summary?.understaffedCount ?? 0) > 0
                  ? `${summary!.understaffedCount} event${summary!.understaffedCount !== 1 ? "s" : ""} understaffed`
                  : "All upcoming events fully staffed"}
              </p>
              <p className="text-[11px] text-text-muted">Below the FR-37 recommended coordinator count</p>
            </div>
          </div>
          <ChevronRight size={15} className="text-text-muted shrink-0" aria-hidden="true" />
        </button>

        <button
          onClick={() => router.push("/staff/admin/vendors")}
          className={cn(
            "flex items-center justify-between rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-card-hover",
            (summary?.vendorGapCount ?? 0) > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
              <Store size={16} className={(summary?.vendorGapCount ?? 0) > 0 ? "text-amber-600" : "text-emerald-600"} aria-hidden="true" />
            </div>
            <div>
              <p className={cn("text-[13px] font-semibold", (summary?.vendorGapCount ?? 0) > 0 ? "text-amber-700" : "text-emerald-700")}>
                {isLoading ? "Checking vendor coverage…" : (summary?.vendorGapCount ?? 0) > 0
                  ? `${summary!.vendorGapCount} event${summary!.vendorGapCount !== 1 ? "s" : ""} with uncovered vendor needs`
                  : "All requested vendor categories covered"}
              </p>
              <p className="text-[11px] text-text-muted">Client-requested categories without a confirmed vendor</p>
            </div>
          </div>
          <ChevronRight size={15} className="text-text-muted shrink-0" aria-hidden="true" />
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Needs attention ── */}
        <motion.div variants={itemVariants}>
          <NeedsAttentionList items={summary?.needsAttention ?? []} isLoading={isLoading} />
        </motion.div>

        {/* ── This week's events ── */}
        <motion.div variants={itemVariants} className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="text-[13px] font-semibold tracking-tight text-text-main">This week's events</p>
              <p className="text-[11px] text-text-muted mt-0.5">Next 7 days</p>
            </div>
            <button
              onClick={() => router.push("/staff/admin/bookings")}
              className="text-[12px] font-medium text-primary hover:underline"
            >
              View all
            </button>
          </div>

          <div className="p-3 space-y-1">
            {isLoading && (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-border/30 animate-pulse" />)}
              </div>
            )}

            {!isLoading && (!summary || summary.upcomingEvents.length === 0) && (
              <p className="py-8 text-center text-[12px] text-text-muted">
                Nothing scheduled in the next 7 days.
              </p>
            )}

            {summary?.upcomingEvents.map((e) => (
              <button
                key={e.bookingId}
                onClick={() => router.push(`/staff/admin/bookings/${e.bookingId}`)}
                className="w-full flex items-center justify-between gap-3 rounded-lg p-3 text-left hover:bg-primary-soft/20 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[13px] font-semibold text-text-main">
                      {EVENT_TYPE_LABELS[e.eventType] ?? e.eventType}
                    </p>
                    <Badge variant={e.status === "CONFIRMED" ? "success" : "warning"} className="text-[9px]">
                      {e.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">{e.clientName}</p>
                  <div className="flex items-center gap-1 text-[11px] text-text-muted mt-0.5">
                    <MapPin size={9} aria-hidden="true" />
                    <span className="truncate">{e.venue}</span>
                  </div>
                </div>
                <p className="text-[12px] font-medium text-text-sub shrink-0">{fmtDate(e.eventDate)}</p>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
