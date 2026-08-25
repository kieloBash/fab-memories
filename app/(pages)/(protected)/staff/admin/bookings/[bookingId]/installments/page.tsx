// app/(pages)/(protected)/staff/admin/bookings/[bookingId]/installments/page.tsx
"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useBooking } from "@/features/bookings"
import { useBookingPayments } from "@/features/payments"
import { InstallmentScheduleForm } from "@/features/installments/components/installment-schedule-form"
import { InstallmentScheduleTable } from "@/features/installments/components/installment-schedule-table"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CalendarDays, AlertCircle, RefreshCcw } from "lucide-react"

interface Props { params: Promise<{ bookingId: string }> }

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n)

export default function AdminInstallmentSchedulePage({ params }: Props) {
  const { bookingId } = use(params)
  const router = useRouter()

  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const { data: payments } = useBookingPayments(bookingId)

  const isLoading = bookingLoading

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl border border-border bg-white animate-pulse" />
        ))}
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-[13px] text-red-600">
        Booking not found.
      </div>
    )
  }

  if (booking.status !== "CONFIRMED") {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
          <ArrowLeft size={15} aria-hidden="true" />
          Back
        </Button>
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800">Booking not confirmed</p>
            <p className="text-[13px] text-amber-700 mt-0.5">
              Installment schedules can only be set for confirmed bookings. This booking is currently{" "}
              <strong>{booking.status}</strong>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const packagePrice = Number(booking.package.price)

  // Derive depositPaid from the most recent VERIFIED DEPOSIT payment.
  // payments are ordered newest-first (DESC) from the API.
  const verifiedDeposit = payments
    ?.filter((p) => p.paymentType === "DEPOSIT" && p.status === "VERIFIED")
    .at(0)
  const depositPaid = verifiedDeposit ? Number(verifiedDeposit.amount) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-6 max-w-3xl"
    >
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
        <ArrowLeft size={15} aria-hidden="true" />
        Back to booking
      </Button>

      <PageHeader
        title="Installment schedule"
        subtitle={`${booking.package.name} · ${booking.client.fullName} · ${booking.venue}`}
        icon={CalendarDays}
      />

      {/* Context card */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-white px-5 py-3">
        <div>
          <p className="text-[11px] text-text-muted">Package price</p>
          <p className="text-[18px] font-bold tracking-tighter text-text-main">
            {fmt(packagePrice)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-text-muted">Deposit paid</p>
          <p className="text-[16px] font-bold tracking-tighter text-emerald-600">
            {fmt(depositPaid)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-text-muted">Client</p>
          <p className="text-[13px] font-semibold text-text-main">
            {booking.client.fullName}
          </p>
        </div>
      </div>

      {/* Current schedule */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Current schedule
        </p>
        <InstallmentScheduleTable
          bookingId={bookingId}
          packagePrice={packagePrice}
          depositPaid={depositPaid}
        />
      </div>

      {/* Set / replace schedule form */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <div className="flex items-start gap-2 mb-0.5">
          <RefreshCcw size={13} className="text-primary mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[14px] font-semibold tracking-tight text-text-main">
              Set / replace schedule
            </p>
            <p className="text-[12px] text-text-muted mt-0.5">
              Enter the installment terms agreed in the contract. Saving replaces
              any existing unpaid installments. Paid installments are locked.
            </p>
          </div>
        </div>

        <InstallmentScheduleForm
          bookingId={bookingId}
          packagePrice={packagePrice}
          depositPaid={depositPaid}
          onSuccess={() => router.refresh()}
        />
      </div>
    </motion.div>
  )
}
