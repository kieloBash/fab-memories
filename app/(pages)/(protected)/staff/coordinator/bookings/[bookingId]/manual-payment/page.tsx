// app/(pages)/(protected)/staff/coordinator/bookings/[bookingId]/manual-payment/page.tsx
"use client"

import type { PaymentMethod, PaymentType } from "@/app/generated/prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/ui/page-header"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useBooking } from "@/features/bookings"
import { useInstallments } from "@/features/installments/installments.hooks"
import { PAYMENT_METHOD_LABELS, useBookingPayments, useRecordManualPayment } from "@/features/payments"
import { SPRING } from "@/lib/framer/framer-utils"
import { motion } from "framer-motion"
import { AlertCircle, ArrowLeft, Banknote } from "lucide-react"
import { useRouter } from "next/navigation"
import { use, useState } from "react"

type RecordablePaymentType = "DEPOSIT" | "INSTALLMENT" | "FULL_BALANCE"

const MANUAL_METHODS: PaymentMethod[] = ["CASH", "GCASH", "MAYA", "BANK_TRANSFER", "CHEQUE"]

interface Props { params: Promise<{ bookingId: string }> }

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(n)

export default function CoordinatorManualPaymentPage({ params }: Props) {
  const { bookingId } = use(params)
  const router = useRouter()

  const { data: booking } = useBooking(bookingId)
  const { data: payments } = useBookingPayments(bookingId)
  const { data: installmentData } = useInstallments(bookingId)
  const { mutate, isPending } = useRecordManualPayment()

  const [paymentType, setPaymentType] = useState<RecordablePaymentType>("FULL_BALANCE")
  const [installmentId, setInstallmentId] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("CASH")
  const [amount, setAmount] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [verificationNote, setVerificationNote] = useState("")

  if (!booking) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-[13px] text-red-600">
        Booking not found.
      </div>
    )
  }

  const agreedPrice = Number(booking.agreedPrice)
  const depositPaid = payments
    ?.filter((p) => p.paymentType === "DEPOSIT" && p.status === "VERIFIED")
    .reduce((s, p) => s + Number(p.amount), 0) ?? 0
  const balancePaid = payments
    ?.filter((p) => p.paymentType === "FULL_BALANCE" && p.status === "VERIFIED")
    .reduce((s, p) => s + Number(p.amount), 0) ?? 0
  const remaining = Math.max(0, agreedPrice - depositPaid - balancePaid)

  const depositVerified = depositPaid > 0
  const unpaidInstallments = installmentData?.installments.filter((i) => i.status === "UNPAID") ?? []

  const availableTypes: { value: RecordablePaymentType; label: string; hint: string }[] = []
  if (!depositVerified) {
    availableTypes.push({ value: "DEPOSIT", label: "Reservation Deposit", hint: `Required: ${booking.depositAmount ? fmt(Number(booking.depositAmount)) : "not set"}` })
  }
  if (depositVerified && booking.paymentPlan === "INSTALLMENT" && unpaidInstallments.length > 0) {
    availableTypes.push({ value: "INSTALLMENT", label: "Installment Payment", hint: `${unpaidInstallments.length} unpaid installment${unpaidInstallments.length > 1 ? "s" : ""}` })
  }
  if (depositVerified && booking.paymentPlan === "FULL" && remaining > 0) {
    availableTypes.push({ value: "FULL_BALANCE", label: "Full Balance Payment", hint: `Remaining: ${fmt(remaining)}` })
  }

  if (availableTypes.length === 0) {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
          <ArrowLeft size={15} aria-hidden="true" /> Back
        </Button>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-[13px] text-emerald-700">
          No outstanding payments for this booking.
        </div>
      </div>
    )
  }

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) return

    mutate(
      {
        bookingId,
        paymentType: paymentType as PaymentType,
        installmentId: paymentType === "INSTALLMENT" ? installmentId : undefined,
        method,
        amount: parsedAmount,
        referenceNumber: referenceNumber.trim() || undefined,
        verificationNote: verificationNote.trim() || undefined,
      },
      { onSuccess: () => router.push(`/staff/coordinator/bookings/${bookingId}`) },
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6 max-w-xl"
    >
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
        <ArrowLeft size={15} aria-hidden="true" /> Back to booking
      </Button>

      <PageHeader
        title="Record manual payment"
        subtitle={`${booking.client.fullName} · ${booking.package.name}`}
        icon={Banknote}
      />

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <AlertCircle size={15} className="text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[12px] text-blue-700">
          Use this form to record payments received in person (cash, bank transfer done outside the system, etc.).
          The payment will be marked as <strong>verified immediately</strong> — no proof upload required.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-5 space-y-5">
        <div className="space-y-2">
          <Label>Payment type</Label>
          <div className="flex flex-col gap-2">
            {availableTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setPaymentType(t.value); setInstallmentId("") }}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${paymentType === t.value
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-white hover:border-border-strong"
                  }`}
              >
                <span className={`text-[13px] font-semibold ${paymentType === t.value ? "text-primary" : "text-text-main"}`}>
                  {t.label}
                </span>
                <span className="text-[11px] text-text-muted">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {paymentType === "INSTALLMENT" && (
          <div className="space-y-1.5">
            <Label>Which installment?</Label>
            <Select value={installmentId} onValueChange={(e) => setInstallmentId(e!)}>
              <SelectTrigger>
                <SelectValue placeholder="Select installment…" />
              </SelectTrigger>
              <SelectContent>
                {unpaidInstallments.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    #{i.order} — {fmt(Number(i.amount))} (due {new Date(i.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MANUAL_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Amount (PHP)</Label>
            <Input
              type="number" min="0" step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Reference number <span className="text-text-muted text-[11px]">(optional)</span></Label>
          <Input
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="e.g. receipt no., bank ref…"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Staff note <span className="text-text-muted text-[11px]">(optional)</span></Label>
          <Textarea
            value={verificationNote}
            onChange={(e) => setVerificationNote(e.target.value)}
            placeholder="e.g. Cash received during site visit on Aug 29"
            rows={2}
          />
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={
            isPending ||
            !amount ||
            parseFloat(amount) <= 0 ||
            (paymentType === "INSTALLMENT" && !installmentId)
          }
        >
          {isPending ? "Recording…" : "Record payment as verified"}
        </Button>
      </div>
    </motion.div>
  )
}
