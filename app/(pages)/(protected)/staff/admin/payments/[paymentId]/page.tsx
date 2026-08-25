// app/(pages)/(protected)/(staff)/staff/admin/payments/[paymentId]/page.tsx
"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { usePayment, PAYMENT_METHOD_LABELS } from "@/features/payments"
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge"
import { PaymentVerificationForm } from "@/features/payments/components/payment-verification-form"
import { InstallmentScheduleTable } from "@/features/installments/components/installment-schedule-table"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, ExternalLink } from "lucide-react"

interface Props {
  params: Promise<{ paymentId: string }>
}

export default function AdminPaymentDetailPage({ params }: Props) {
  const { paymentId } = use(params)
  const router = useRouter()
  const { data: payment, isLoading, isError } = usePayment(paymentId)

  if (isLoading) return <p className="p-8 text-muted-foreground">Loading…</p>
  if (isError || !payment) return <p className="p-8 text-destructive">Payment not found.</p>

  const formattedAmount = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(payment.amount))

  return (
    <div className="container max-w-2xl space-y-6 py-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 size-4" /> Back
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{formattedAmount}</h1>
        <PaymentStatusBadge status={payment.status} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <dt className="text-muted-foreground">Client</dt>
        <dd>{payment.booking.client.fullName}</dd>

        <dt className="text-muted-foreground">Booking</dt>
        <dd>
          <button
            onClick={() =>
              router.push(`/staff/admin/bookings/${payment.bookingId}`)
            }
            className="flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            View Booking <ExternalLink className="size-3" />
          </button>
        </dd>

        <dt className="text-muted-foreground">Method</dt>
        <dd>{PAYMENT_METHOD_LABELS[payment.method]}</dd>

        {payment.referenceNumber && (
          <>
            <dt className="text-muted-foreground">Reference No.</dt>
            <dd className="font-mono">{payment.referenceNumber}</dd>
          </>
        )}

        {payment.proofImageUrl && (
          <>
            <dt className="text-muted-foreground">Proof</dt>
            <dd>
              <a
                href={payment.proofImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary underline-offset-4 hover:underline"
              >
                View Screenshot <ExternalLink className="size-3" />
              </a>
            </dd>
          </>
        )}

        {payment.verifiedBy && (
          <>
            <dt className="text-muted-foreground">Verified By</dt>
            <dd>{payment.verifiedBy.fullName}</dd>
          </>
        )}

        {payment.verificationNote && (
          <>
            <dt className="text-muted-foreground">Verification Note</dt>
            <dd>{payment.verificationNote}</dd>
          </>
        )}
      </dl>

      {payment.status === "SUBMITTED" && (
        <PaymentVerificationForm
          paymentId={payment.id}
          onSuccess={() => router.refresh()}
        />
      )}

      <Separator />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Installment Schedule</h2>
        <InstallmentScheduleTable paymentId={payment.id} canMarkPaid />
      </div>
    </div>
  )
}
