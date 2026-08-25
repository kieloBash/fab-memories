// app/(pages)/(protected)/(client)/portal/bookings/[bookingId]/payment/page.tsx
"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useBooking } from "@/features/bookings"
import { InstallmentScheduleTable } from "@/features/installments/components/installment-schedule-table"
import { PAYMENT_METHOD_LABELS, useBookingPayments } from "@/features/payments"
import { PaymentProofUpload } from "@/features/payments/components/payment-proof-upload"
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge"
import { ArrowLeft as ArrowLeftIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { use, useState } from "react"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n)

interface Props { params: Promise<{ bookingId: string }> }

export default function ClientPaymentPage({ params }: Props) {
  const { bookingId } = use(params)
  const router = useRouter()

  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const { data: payments, isLoading: paymentsLoading, refetch } = useBookingPayments(bookingId)

  // Installment payment dialog state
  const [payingInstallment, setPayingInstallment] = useState<{
    installmentId: string
    amount: number
  } | null>(null)

  if (bookingLoading || paymentsLoading) {
    return <p className="p-8 text-muted-foreground">Loading…</p>
  }
  if (!booking) return <p className="p-8 text-destructive">Booking not found.</p>

  const packagePrice = Number(booking.package.price)
  const depositPayment = payments?.find((p) => p.paymentType === "DEPOSIT")
  const depositVerified = depositPayment?.status === "VERIFIED"

  // Show deposit submission if no deposit submitted yet, or if flagged (needs resubmission)
  const showDepositForm =
    !depositPayment || depositPayment.status === "FLAGGED"

  return (
    <div className="container max-w-2xl space-y-8 py-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeftIcon className="mr-2 size-4" /> Back to Booking
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Payment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {booking.package.name} — {fmt(packagePrice)}
        </p>
      </div>

      {/* ── Deposit section ──────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Reservation Deposit</h2>
          {depositPayment && <PaymentStatusBadge status={depositPayment.status} />}
        </div>

        {depositPayment && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-3 text-sm">
            <dt className="text-muted-foreground">Amount</dt>
            <dd>{fmt(Number(depositPayment.amount))}</dd>

            <dt className="text-muted-foreground">Method</dt>
            <dd>{PAYMENT_METHOD_LABELS[depositPayment.method]}</dd>

            {depositPayment.referenceNumber && (
              <>
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="font-mono">{depositPayment.referenceNumber}</dd>
              </>
            )}

            {depositPayment.verificationNote && (
              <>
                <dt className="text-muted-foreground">Staff Note</dt>
                <dd className={depositPayment.status === "FLAGGED" ? "text-destructive" : ""}>
                  {depositPayment.verificationNote}
                </dd>
              </>
            )}
          </dl>
        )}

        {showDepositForm && (
          <div className="rounded-lg border p-4 space-y-3">
            {depositPayment?.status === "FLAGGED" && (
              <p className="text-sm text-destructive font-medium">
                Your deposit was flagged. Please resubmit a valid proof of payment.
              </p>
            )}
            <PaymentProofUpload
              bookingId={bookingId}
              paymentType="DEPOSIT"
              defaultAmount={packagePrice * 0.3} // 30% deposit suggestion
              onSuccess={() => refetch()}
            />
          </div>
        )}

        {depositPayment?.status === "SUBMITTED" && (
          <p className="text-sm text-muted-foreground">
            Your deposit proof has been submitted and is awaiting staff verification.
            Your booking will be confirmed once verified.
          </p>
        )}

        {depositVerified && (
          <p className="text-sm text-green-600 font-medium">
            ✓ Deposit verified — your booking is confirmed.
          </p>
        )}
      </div>

      {/* ── Installment section (only after deposit is verified) ── */}
      {depositVerified && (
        <>
          <Separator />
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Installment Schedule</h2>
            <InstallmentScheduleTable
              bookingId={bookingId}
              onPayInstallment={(installmentId, amount) =>
                setPayingInstallment({ installmentId, amount })
              }
            />
          </div>
        </>
      )}

      {/* ── Installment payment dialog ─────────────────────── */}
      <Dialog
        open={!!payingInstallment}
        onOpenChange={(open) => { if (!open) setPayingInstallment(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Installment Payment</DialogTitle>
          </DialogHeader>
          {payingInstallment && (
            <PaymentProofUpload
              bookingId={bookingId}
              paymentType="INSTALLMENT"
              installmentId={payingInstallment.installmentId}
              defaultAmount={payingInstallment.amount}
              onSuccess={() => {
                setPayingInstallment(null)
                refetch()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
