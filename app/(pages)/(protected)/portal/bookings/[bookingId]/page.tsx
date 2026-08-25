// app/(pages)/(protected)/portal/bookings/[bookingId]/page.tsx

"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useBooking, EVENT_TYPE_LABELS } from "@/features/bookings";
import { useBookingPayments } from "@/features/payments";
import { useInstallments } from "@/features/installments/installments.hooks";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ bookingId: string }>;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

// ── Journey step ──────────────────────────────────────────────────────────────
function JourneyStep({
  step,
  label,
  sublabel,
  status,
}: {
  step: number;
  label: string;
  sublabel: string;
  status: "done" | "active" | "pending";
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors",
          status === "done"   && "bg-emerald-500 text-white",
          status === "active" && "bg-primary text-white",
          status === "pending" && "bg-border text-text-muted border border-border"
        )}
      >
        {status === "done" ? <CheckCircle2 size={15} aria-hidden="true" /> : step}
      </div>
      <div className="pt-0.5 min-w-0">
        <p className={cn(
          "text-[13px] font-semibold tracking-tight",
          status === "pending" ? "text-text-muted" : "text-text-main"
        )}>
          {label}
        </p>
        <p className="text-[11px] text-text-muted leading-relaxed">{sublabel}</p>
      </div>
    </div>
  );
}

export default function ClientBookingDetailPage({ params }: Props) {
  const { bookingId } = use(params);
  const router = useRouter();

  const { data: booking, isLoading, isError } = useBooking(bookingId);
  const { data: payments } = useBookingPayments(bookingId);
  const { data: installmentData } = useInstallments(bookingId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-[13px] text-red-600">
        Booking not found.
      </div>
    );
  }

  const deposit         = payments?.find((p) => p.paymentType === "DEPOSIT");
  const depositVerified = deposit?.status === "VERIFIED";
  const depositPending  = deposit?.status === "SUBMITTED";
  const depositFlagged  = deposit?.status === "FLAGGED";
  const noDeposit       = !deposit;

  const totalInst  = installmentData?.installments.length ?? 0;
  const paidInst   = installmentData?.installments.filter((i) => i.status === "PAID").length ?? 0;

  // Journey step statuses
  const step1Status = booking.status === "PENDING" && noDeposit ? "active"
    : depositPending ? "active"
    : depositVerified ? "done"
    : depositFlagged ? "active"
    : "active";

  const step2Status = depositVerified ? (totalInst === 0 ? "active" : "done") : "pending";
  const step3Status = depositVerified && totalInst > 0 && paidInst === totalInst ? "done"
    : depositVerified && totalInst > 0 ? "active"
    : "pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-6 max-w-2xl"
    >
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
        <ArrowLeft size={15} aria-hidden="true" />
        Back
      </Button>

      {/* Page header */}
      <PageHeader
        title={EVENT_TYPE_LABELS[booking.eventType]}
        icon={CalendarDays}
        actions={<BookingStatusBadge status={booking.status} />}
      />

      {/* ── Journey tracker ── */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Your journey
        </p>
        <div className="space-y-4">
          <JourneyStep
            step={1}
            label="Submit reservation deposit"
            sublabel={
              depositVerified ? `Verified on ${deposit?.verifiedAt ? fmtDate(deposit.verifiedAt) : "—"}`
              : depositPending ? "Submitted — awaiting staff verification"
              : depositFlagged ? "Deposit flagged — please resubmit"
              : "Upload your proof of deposit to confirm your booking"
            }
            status={step1Status}
          />
          <div className="ml-4 w-px h-4 bg-border" aria-hidden="true" />
          <JourneyStep
            step={2}
            label="Booking confirmed"
            sublabel="Happens automatically once your deposit is verified"
            status={step2Status}
          />
          <div className="ml-4 w-px h-4 bg-border" aria-hidden="true" />
          <JourneyStep
            step={3}
            label="Settle installments"
            sublabel={
              totalInst === 0
                ? "Admin will set your installment schedule after contract finalisation"
                : `${paidInst} of ${totalInst} installments paid`
            }
            status={step3Status}
          />
        </div>

        {/* CTA button */}
        {booking.status !== "CANCELLED" && (
          <Button
            className="w-full mt-2"
            onClick={() => router.push(`/portal/bookings/${bookingId}/payment`)}
          >
            <CreditCard size={15} aria-hidden="true" />
            {depositVerified ? "Manage payments" : "Go to payments"}
            <ChevronRight size={14} aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* ── Booking details ── */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Booking details
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { icon: CalendarDays, label: "Event date",   value: fmtDate(booking.eventDate) },
            { icon: MapPin,       label: "Venue",        value: booking.venue },
            { icon: Users,        label: "Guest count",  value: `${booking.guestCount} guests` },
            { icon: Package,      label: "Package",      value: booking.package.name },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                <Icon size={14} className="text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] text-text-muted">{label}</p>
                <p className="text-[13px] font-medium text-text-main">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-between">
          <span className="text-[12px] text-text-muted">Package price</span>
          <span className="text-[16px] font-bold tracking-tighter text-text-main">
            {fmt(Number(booking.package.price))}
          </span>
        </div>

        {booking.notes && (
          <div className="rounded-lg bg-background-blush p-3">
            <p className="text-[11px] text-text-muted mb-0.5">Notes</p>
            <p className="text-[13px] text-text-sub">{booking.notes}</p>
          </div>
        )}

        {booking.cancellationReason && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-[11px] font-semibold text-red-700">Cancellation reason</p>
              <p className="text-[13px] text-red-600">{booking.cancellationReason}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
