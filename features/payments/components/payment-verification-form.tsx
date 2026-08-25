// features/payments/components/payment-verification-form.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, XCircle } from "lucide-react"
import { useVerifyPayment } from "../payments.hooks"

interface PaymentVerificationFormProps {
  paymentId: string
  onSuccess?: () => void
}

export function PaymentVerificationForm({
  paymentId,
  onSuccess,
}: PaymentVerificationFormProps) {
  const { mutate, isPending } = useVerifyPayment()
  const [note, setNote] = useState("")

  const handleAction = (action: "VERIFY" | "FLAG") => {
    mutate(
      { id: paymentId, input: { action, verificationNote: note.trim() || undefined } },
      { onSuccess },
    )
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">Staff Verification</h3>

      <div className="space-y-1.5">
        <Label htmlFor="verif-note">Note (optional)</Label>
        <Textarea
          id="verif-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note visible to the client…"
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <Button
          className="flex-1"
          variant="default"
          onClick={() => handleAction("VERIFY")}
          disabled={isPending}
        >
          <CheckCircle2 className="mr-2 size-4" />
          {isPending ? "Processing…" : "Verify Payment"}
        </Button>

        <Button
          className="flex-1"
          variant="destructive"
          onClick={() => handleAction("FLAG")}
          disabled={isPending}
        >
          <XCircle className="mr-2 size-4" />
          {isPending ? "Processing…" : "Flag for Resubmission"}
        </Button>
      </div>
    </div>
  )
}
