// app/(pages)/(protected)/staff/admin/page.tsx

"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  CalendarDays,
  CreditCard,
  Package,
  Clock,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react"

import { useBookings } from "@/features/bookings"
import { usePayments } from "@/features/payments"
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge"
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge"
import { PAYMENT_METHOD_LABELS } from "@/features/payments"
import { EVENT_TYPE_LABELS } from "@/features/bookings/bookings.constants"

import { StatCard } from "@/components/ui/stat-card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ── Animation helpers ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: string | number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function isUpcoming(iso: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const next7 = new Date(today)
  next7.setDate(today.getDate() + 7)
  const d = new Date(iso)
  return d >= today && d <= next7
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={cols}
        className="py-10 text-center text-text-muted text-[13px]"
      >
        {message}
      </TableCell>
    </TableRow>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function SkeletonRows({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-primary-soft" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter()

  const {
    data: allBookings,
    isLoading: bookingsLoading,
  } = useBookings()

  const {
    data: allPayments,
    isLoading: paymentsLoading,
  } = usePayments()

  // ── Derived KPIs ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeBookings =
      allBookings?.filter((b) => b.status === "CONFIRMED").length ?? 0

    const pendingPayments =
      allPayments?.filter((p) => p.status === "SUBMITTED").length ?? 0

    const upcomingEvents =
      allBookings?.filter(
        (b) => b.status === "CONFIRMED" && isUpcoming(b.eventDate)
      ).length ?? 0

    const totalRevenue = allPayments
      ?.filter((p) => p.status === "VERIFIED")
      .reduce((sum, p) => sum + Number(p.amount), 0) ?? 0

    return { activeBookings, pendingPayments, upcomingEvents, totalRevenue }
  }, [allBookings, allPayments])

  // ── Recent bookings (last 5) ─────────────────────────────────────────────
  const recentBookings = useMemo(
    () =>
      [...(allBookings ?? [])]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5),
    [allBookings]
  )

  // ── Pending payments ─────────────────────────────────────────────────────
  const pendingPayments = useMemo(
    () =>
      (allPayments ?? [])
        .filter((p) => p.status === "SUBMITTED")
        .slice(0, 5),
    [allPayments]
  )

  // ── Today greeting ───────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-8"
    >
      {/* ── Page header ── */}
      <motion.div variants={itemVariants}>
        <PageHeader
          title="Dashboard"
          subtitle={today}
          icon={LayoutDashboard}
        />
      </motion.div>

      {/* ── KPI stat cards ── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Active bookings"
          value={bookingsLoading ? "—" : stats.activeBookings}
          icon={CalendarDays}
          description="Confirmed events"
          accent
        />
        <StatCard
          label="Pending verification"
          value={paymentsLoading ? "—" : stats.pendingPayments}
          icon={Clock}
          description="Payments awaiting review"
          trend={
            stats.pendingPayments > 0
              ? { direction: "down", label: "Needs attention" }
              : { direction: "neutral", label: "All clear" }
          }
        />
        <StatCard
          label="Events this week"
          value={bookingsLoading ? "—" : stats.upcomingEvents}
          icon={CalendarDays}
          description="Next 7 days"
        />
        <StatCard
          label="Verified revenue"
          value={paymentsLoading ? "—" : formatCurrency(stats.totalRevenue)}
          icon={CreditCard}
          description="All verified payments"
          trend={{ direction: "up", label: "Total to date" }}
        />
      </motion.div>

      {/* ── Two-column section: Recent Bookings + Pending Payments ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent Bookings */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-text-main">
                Recent bookings
              </h2>
              <p className="text-[12px] text-text-muted">Latest 5 submissions</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/staff/admin/bookings")}
              className="text-[13px]"
            >
              View all
              <ArrowRight size={14} aria-hidden="true" />
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingsLoading ? (
                  <SkeletonRows cols={4} />
                ) : recentBookings.length === 0 ? (
                  <EmptyRow cols={4} message="No bookings yet." />
                ) : (
                  recentBookings.map((booking) => (
                    <TableRow
                      key={booking.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/staff/admin/bookings/${booking.id}`)
                      }
                    >
                      <TableCell className="font-medium">
                        {booking.client.fullName}
                      </TableCell>
                      <TableCell className="text-text-sub">
                        {EVENT_TYPE_LABELS[booking.eventType]}
                      </TableCell>
                      <TableCell className="text-text-sub">
                        {formatDate(booking.eventDate)}
                      </TableCell>
                      <TableCell>
                        <BookingStatusBadge status={booking.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>

        {/* Pending Payments */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-text-main">
                Pending verification
              </h2>
              <p className="text-[12px] text-text-muted">
                Payments awaiting review
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/staff/admin/payments")}
              className="text-[13px]"
            >
              View all
              <ArrowRight size={14} aria-hidden="true" />
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsLoading ? (
                  <SkeletonRows cols={4} />
                ) : pendingPayments.length === 0 ? (
                  <EmptyRow cols={4} message="No pending payments." />
                ) : (
                  pendingPayments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/staff/admin/payments/${payment.id}`)
                      }
                    >
                      <TableCell className="font-medium">
                        {payment.booking.client.fullName}
                      </TableCell>
                      <TableCell className="font-semibold text-text-main">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-text-sub">
                        {PAYMENT_METHOD_LABELS[payment.method]}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={payment.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>

      {/* ── Quick links row ── */}
      <motion.div variants={itemVariants}>
        <p className="mb-3 text-[11px] font-semibold tracking-widest uppercase text-text-muted">
          Quick access
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "All bookings", href: "/staff/admin/bookings", icon: CalendarDays },
            { label: "All payments", href: "/staff/admin/payments", icon: CreditCard },
            { label: "Packages", href: "/staff/admin/packages", icon: Package },
          ].map((link) => {
            const Icon = link.icon
            return (
              <Button
                key={link.href}
                variant="outline"
                size="sm"
                onClick={() => router.push(link.href)}
              >
                <Icon size={14} aria-hidden="true" />
                {link.label}
              </Button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}
