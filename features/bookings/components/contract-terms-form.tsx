// features/bookings/components/contract-terms-form.tsx
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  ClipboardList, CreditCard, Wallet,
  CheckCircle2, AlertCircle,
} from "lucide-react"
import { useSetContractTerms } from "../bookings.hooks"
import { PAYMENT_PLAN_LABELS } from "../bookings.constants"
import type { BookingWithRelations } from "../bookings.types"
import type { PaymentPlan } from "@/app/generated/prisma/client"
import { cn } from "@/lib/utils"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(n)

const today = new Date().toISOString().split("T")[0]

interface ContractTermsFormProps {
  booking: BookingWithRelations
  onSuccess?: () => void
}

export function ContractTermsForm({ booking, onSuccess }: ContractTermsFormProps) {
  const { mutate, isPending } = useSetContractTerms()

  const [agreedPrice,        setAgreedPrice]        = useState(Number(booking.agreedPrice).toString())
  const [paymentPlan,        setPaymentPlan]        = useState<PaymentPlan | "">(booking.paymentPlan ?? "")
  const [depositAmount,      setDepositAmount]      = useState(booking.depositAmount ? Number(booking.depositAmount).toString() : "")
  const [depositDueDate,     setDepositDueDate]     = useState(booking.depositDueDate ? booking.depositDueDate.split("T")[0] : "")
  const [fullPaymentDueDate, setFullPaymentDueDate] = useState(booking.fullPaymentDueDate ? booking.fullPaymentDueDate.split("T")[0] : "")
  const [staffNote,          setStaffNote]          = useState(booking.staffNote ?? "")

  useEffect(() => {
    setAgreedPrice(Number(booking.agreedPrice).toString())
    setPaymentPlan(booking.paymentPlan ?? "")
    setDepositAmount(booking.depositAmount ? Number(booking.depositAmount).toString() : "")
    setDepositDueDate(booking.depositDueDate ? booking.depositDueDate.split("T")[0] : "")
    setFullPaymentDueDate(booking.fullPaymentDueDate ? booking.fullPaymentDueDate.split("T")[0] : "")
    setStaffNote(booking.staffNote ?? "")
  }, [booking])

  const parsedPrice          = parseFloat(agreedPrice)
  const parsedDeposit        = parseFloat(depositAmount)
  const depositExceedsPrice  = !isNaN(parsedDeposit) && !isNaN(parsedPrice) && parsedDeposit >= parsedPrice
  const remainingBalance     = !isNaN(parsedPrice) && !isNaN(parsedDeposit) && !depositExceedsPrice
    ? parsedPrice - parsedDeposit
    : null
  const isTermsSet           = !!(booking.paymentPlan && booking.depositAmount)

  const handleSave = () => {
    mutate(
      {
        id: booking.id,
        input: {
          agreedPrice:        parsedPrice  || undefined,
          paymentPlan:        (paymentPlan as PaymentPlan) || undefined,
          depositAmount:      parsedDeposit || undefined,
          depositDueDate:     depositDueDate || undefined,
          fullPaymentDueDate: paymentPlan === "FULL" ? (fullPaymentDueDate || undefined) : undefined,
          staffNote:          staffNote.trim() || undefined,
        },
      },
      { onSuccess },
    )
  }

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ClipboardList size={15} className="text-primary" aria-hidden="true" />
          <h3 className="text-[13px] font-semibold tracking-tight text-text-main">Contract terms</h3>
        </div>
        {isTermsSet ? (
          <Badge variant="success">
            <CheckCircle2 size={11} className="mr-1" /> Terms set
          </Badge>
        ) : (
          <Badge variant="warning">
            <AlertCircle size={11} className="mr-1" /> Pending discussion
          </Badge>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Package price reference */}
        <div className="flex items-center justify-between rounded-lg bg-background-blush px-3 py-2">
          <span className="text-[11px] text-text-muted">Package standard price</span>
          <span className="text-[12px] font-semibold text-text-sub">
            {fmt(Number(booking.package.price))}
            {booking.isProvincial && booking.package.priceProvincial && (
              <span className="ml-1 text-amber-600">→ {fmt(Number(booking.package.priceProvincial))}</span>
            )}
          </span>
        </div>

        {/* Agreed price override */}
        <div className="space-y-1.5">
          <Label htmlFor="agreed-price">
            Agreed price (PHP)
            <span className="ml-1.5 text-[11px] text-text-muted font-normal">Override if negotiated differently</span>
          </Label>
          <Input
            id="agreed-price"
            type="number" min="0" step="0.01"
            value={agreedPrice}
            onChange={(e) => setAgreedPrice(e.target.value)}
            placeholder="e.g. 90000"
          />
        </div>

        {/*
          FIX: selected vs unselected payment plan looked nearly
          identical — both had a light pink-ish background and the
          only difference was a 1px border color shift, easy to miss.
          Now the selected tile gets a 2px primary border + ring +
          shadow (shadow-primary-sm now actually renders) so it reads
          unambiguously as "chosen," matching the event-type tile
          pattern used on the new booking form.
        */}
        <div className="space-y-2">
          <Label>Payment plan</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["FULL", "INSTALLMENT"] as PaymentPlan[]).map((plan) => {
              const active = paymentPlan === plan
              return (
                <button
                  key={plan}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPaymentPlan(plan)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3.5 transition-all text-center",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    active
                      ? "border-primary bg-primary-soft shadow-primary-sm ring-2 ring-primary/15"
                      : "border-border bg-white hover:border-border-strong hover:bg-background-blush",
                  )}
                >
                  {plan === "FULL"
                    ? <Wallet size={18} className={active ? "text-primary" : "text-text-muted"} aria-hidden="true" />
                    : <CreditCard size={18} className={active ? "text-primary" : "text-text-muted"} aria-hidden="true" />}
                  <span className={cn("text-[12px] font-semibold", active ? "text-primary" : "text-text-sub")}>
                    {PAYMENT_PLAN_LABELS[plan]}
                  </span>
                  <span className="text-[10px] text-text-muted leading-tight">
                    {plan === "FULL" ? "One remaining balance payment" : "Split into scheduled installments"}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Deposit amount + due date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="deposit-amount">Deposit amount (PHP)</Label>
            <Input
              id="deposit-amount"
              type="number" min="0" step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="e.g. 25000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deposit-due">Deposit due by</Label>
            <Input
              id="deposit-due"
              type="date"
              value={depositDueDate}
              onChange={(e) => setDepositDueDate(e.target.value)}
            />
          </div>
        </div>

        {depositExceedsPrice && (
          <p className="flex items-center gap-1.5 text-[12px] text-red-600">
            <AlertCircle size={13} aria-hidden="true" />
            Deposit must be less than the agreed price
          </p>
        )}

        {/* Full payment due date — only shown for FULL plan */}
        {paymentPlan === "FULL" && (
          <div className="space-y-1.5">
            <Label htmlFor="full-payment-due">
              Full balance due by
              <span className="ml-1.5 text-[11px] text-text-muted font-normal">
                When remaining balance must be paid
              </span>
            </Label>
            <Input
              id="full-payment-due"
              type="date"
              value={fullPaymentDueDate}
              onChange={(e) => setFullPaymentDueDate(e.target.value)}
            />
          </div>
        )}

        {/* Remaining balance preview */}
        {remainingBalance !== null && (
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 bg-background-blush">
            <span className="text-[12px] text-text-muted">
              Remaining after deposit
              {paymentPlan === "FULL" && " (full payment)"}
              {paymentPlan === "INSTALLMENT" && " (to schedule as installments)"}
            </span>
            <span className="text-[14px] font-bold tracking-tight text-text-main">{fmt(remainingBalance)}</span>
          </div>
        )}

        {/* Staff note */}
        <div className="space-y-1.5">
          <Label htmlFor="staff-note">
            Staff note
            <span className="ml-1.5 text-[11px] text-text-muted font-normal">Internal — not visible to client</span>
          </Label>
          <Textarea
            id="staff-note"
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
            placeholder="e.g. Discussed via call Aug 29 — client agreed to ₱90k with 3-month installments"
            rows={2}
          />
        </div>

        <Button
          className="w-full"
          onClick={handleSave}
          disabled={isPending || depositExceedsPrice || !agreedPrice}
        >
          {isPending ? "Saving…" : "Save contract terms"}
        </Button>
      </div>
    </div>
  )
}
