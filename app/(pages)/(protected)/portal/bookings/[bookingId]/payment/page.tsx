// app/(pages)/(protected)/(client)/portal/bookings/[bookingId]/payment/page.tsx
"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useBooking } from "@/features/bookings"
import { useBookingPayments } from "@/features/payments"
import { PaymentProofUpload } from "@/features/payments/components/payment-proof-upload"
import { PaymentSummaryCard } from "@/features/payments/components/payment-summary-card"
import { InstallmentScheduleTable } from "@/features/installments/components/installment-schedule-table"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft } from "lucide-react"

interface Props {
  params: Promise<{ bookingId: string }>
}

export default function ClientPaymentPage({ params }: Props) {
  const { bookingId } = use(params)
  const router = useRouter()

  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const { data: payments, isLoading: paymentsLoading, refetch } = useBookingPayments(bookingId)

  if (bookingLoading || paymentsLoading) {
    return <p className="p-8 text-muted-foreground">Loading…</p>
  }

  if (!booking) {
    return <p className="p-8 text-destructive">Booking not found.</p>
  }

  const packagePrice = Number(booking.package.price)

  // Show submission form only if no SUBMITTED / VERIFIED payment exists
  const hasActivePayment = payments?.some(
    (p) => p.status === "SUBMITTED" || p.status === "VERIFIED",
  )

  // Show installments only for the verified payment
  const verifiedPayment = payments?.find((p) => p.status === "VERIFIED")

  return (
    <div className="container max-w-2xl space-y-8 py-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 size-4" /> Back to Booking
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Payment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {booking.package.name} —{" "}
          {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
            packagePrice,
          )}
        </p>
      </div>

      {/* Past submissions */}
      {!!payments?.length && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Payment History</h2>
          <div className="space-y-3">
            {payments.map((payment) => (
              <PaymentSummaryCard key={payment.id} payment={payment} />
            ))}
          </div>
        </div>
      )}

      {/* Installment schedule */}
      {verifiedPayment && (
        <>
          <Separator />
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Installment Schedule</h2>
            <InstallmentScheduleTable paymentId={verifiedPayment.id} canMarkPaid={false} />
          </div>
        </>
      )}

      {/* Submission form */}
      {booking.status === "CONFIRMED" && !hasActivePayment && (
        <>
          <Separator />
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Submit Payment Proof</h2>
            <PaymentProofUpload
              bookingId={bookingId}
              totalAmount={packagePrice}
              onSuccess={() => refetch()}
            />
          </div>
        </>
      )}

      {booking.status !== "CONFIRMED" && !payments?.length && (
        <p className="text-sm text-muted-foreground">
          Payment can only be submitted after your booking is confirmed.
        </p>
      )}
    </div>
  )
}
