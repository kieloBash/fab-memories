// app/(pages)/(protected)/staff/coordinator/payments/[paymentId]/page.tsx
"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  usePayment,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
} from "@/features/payments"
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge"
import { PaymentVerificationForm } from "@/features/payments/components/payment-verification-form"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  CreditCard,
  ExternalLink,
  User,
  CalendarDays,
  Hash,
  ImageIcon,
  Maximize2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"

interface Props { params: Promise<{ paymentId: string }> }

const fmt = (n: string | number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(Number(n))

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "—"

export default function CoordinatorPaymentDetailPage({ params }: Props) {
  const { paymentId } = use(params)
  const router = useRouter()
  const { data: payment, isLoading, isError } = usePayment(paymentId)
  const [proofOpen, setProofOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 rounded-xl border border-border bg-white animate-pulse" />
        ))}
      </div>
    )
  }
  if (isError || !payment) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-[13px] text-red-600">
        Payment not found.
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
        <ArrowLeft size={15} aria-hidden="true" />
        Back
      </Button>

      <PageHeader
        title={fmt(payment.amount)}
        subtitle={PAYMENT_TYPE_LABELS[payment.paymentType]}
        icon={CreditCard}
        actions={<PaymentStatusBadge status={payment.status} />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">

        <div className="flex flex-col gap-5">

          <div className="rounded-xl border border-border bg-white p-5 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Payment details
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: User,        label: "Client",      value: payment.booking.client.fullName },
                { icon: CreditCard,  label: "Method",      value: PAYMENT_METHOD_LABELS[payment.method] },
                { icon: CalendarDays, label: "Submitted",  value: fmtDate(payment.submittedAt) },
                ...(payment.referenceNumber
                  ? [{ icon: Hash, label: "Reference no.", value: payment.referenceNumber }]
                  : []),
                ...(payment.verifiedBy
                  ? [{ icon: User, label: "Actioned by", value: payment.verifiedBy.fullName }]
                  : []),
                ...(payment.verifiedAt
                  ? [{ icon: CalendarDays, label: "Actioned on", value: fmtDate(payment.verifiedAt) }]
                  : []),
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

            {payment.verificationNote && (
              <div className="rounded-lg bg-background-blush p-3 border border-border">
                <p className="text-[11px] text-text-muted mb-0.5">Staff note</p>
                <p className="text-[13px] text-text-sub">{payment.verificationNote}</p>
              </div>
            )}

            <button
              onClick={() => router.push(`/staff/coordinator/bookings/${payment.bookingId}`)}
              className="flex items-center gap-1.5 text-[12px] text-primary hover:underline underline-offset-4"
            >
              <ExternalLink size={12} aria-hidden="true" />
              View booking
            </button>
          </div>

          {payment.status === "SUBMITTED" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-xl border-2 border-primary/20 bg-white p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                <p className="text-[13px] font-semibold text-text-main">
                  Staff verification required
                </p>
              </div>
              <p className="text-[12px] text-text-muted">
                {payment.paymentType === "DEPOSIT"
                  ? "Verifying this deposit will confirm the client's booking."
                  : "Verifying this payment will mark the linked installment as paid."}
              </p>
              <PaymentVerificationForm
                paymentId={payment.id}
                paymentType={payment.paymentType}
                onSuccess={() => router.refresh()}
              />
            </motion.div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Proof of payment
              </p>
              {payment.proofImageUrl && (
                <button
                  onClick={() => setProofOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline underline-offset-4 cursor-pointer"
                  aria-label="Expand proof image"
                >
                  <Maximize2 size={11} aria-hidden="true" />
                  Expand
                </button>
              )}
            </div>

            {payment.proofImageUrl ? (
              <button
                onClick={() => setProofOpen(true)}
                className="block w-full overflow-hidden rounded-lg border border-border cursor-zoom-in"
                aria-label="View proof of payment"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={payment.proofImageUrl}
                  alt="Proof of payment"
                  className="w-full object-cover max-h-64 hover:scale-105 transition-transform duration-200"
                />
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 h-32 rounded-lg border border-dashed border-border bg-background-blush">
                <ImageIcon size={20} className="text-text-muted" aria-hidden="true" />
                <p className="text-[12px] text-text-muted">
                  {payment.referenceNumber
                    ? "Reference number submitted (no image)"
                    : "No proof uploaded yet"}
                </p>
              </div>
            )}

            {payment.referenceNumber && (
              <div className="rounded-lg bg-background-blush border border-border px-3 py-2">
                <p className="text-[11px] text-text-muted mb-0.5">Reference number</p>
                <p className="text-[13px] font-mono font-medium text-text-main">
                  {payment.referenceNumber}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={proofOpen} onOpenChange={setProofOpen}>
        <DialogContent className="max-w-3xl p-2">
          {payment.proofImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={payment.proofImageUrl}
              alt="Proof of payment (full size)"
              className="w-full rounded-lg object-contain max-h-[80vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
