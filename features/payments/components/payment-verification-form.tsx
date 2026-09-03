// features/payments/components/payment-verification-form.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ShieldCheck, CheckCircle2, XCircle } from "lucide-react"
import { useVerifyPayment } from "../payments.hooks"
import type { PaymentType } from "@/app/generated/prisma/client"
import { PAYMENT_TYPE_LABELS } from "../payments.constants"

interface PaymentVerificationFormProps {
  paymentId: string
  paymentType: PaymentType
  onSuccess?: () => void
}

export function PaymentVerificationForm({
  paymentId,
  paymentType,
  onSuccess,
}: PaymentVerificationFormProps) {
  const { mutate, isPending } = useVerifyPayment()
  const [note, setNote] = useState("")
  const [pendingAction, setPendingAction] = useState<"VERIFY" | "FLAG" | null>(null)

  const handleAction = (action: "VERIFY" | "FLAG") => {
    setPendingAction(action)
    mutate(
      { id: paymentId, input: { action, verificationNote: note.trim() || undefined } },
      { onSuccess, onSettled: () => setPendingAction(null) },
    )
  }

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
          <ShieldCheck size={15} className="text-primary" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold tracking-tight text-text-main">
            Staff verification
          </h3>
          <p className="text-[12px] text-text-muted">
            Verifying this {PAYMENT_TYPE_LABELS[paymentType].toLowerCase()}
            {paymentType === "DEPOSIT" ? " will confirm the booking" : " will mark the installment as paid"}.
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="verif-note">Note <span className="text-text-muted text-[11px] font-normal">(optional, visible to client)</span></Label>
          <Textarea
            id="verif-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note visible to the client…"
            rows={2}
          />
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={() => handleAction("VERIFY")}
            disabled={isPending}
          >
            <CheckCircle2 size={14} aria-hidden="true" />
            {isPending && pendingAction === "VERIFY" ? "Verifying…" : "Verify"}
          </Button>
          <Button
            className="flex-1"
            variant="destructive"
            onClick={() => handleAction("FLAG")}
            disabled={isPending}
          >
            <XCircle size={14} aria-hidden="true" />
            {isPending && pendingAction === "FLAG" ? "Flagging…" : "Flag for resubmission"}
          </Button>
        </div>
      </div>
    </div>
  )
}
