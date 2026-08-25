// features/installments/components/mark-paid-dialog.tsx
"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { useMarkInstallmentPaid } from "../installments.hooks"

interface MarkPaidDialogProps {
  paymentId: string
  installmentId: string
  order: number
}

export function MarkPaidDialog({ paymentId, installmentId, order }: MarkPaidDialogProps) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const { mutate, isPending } = useMarkInstallmentPaid()

  const handleConfirm = () => {
    mutate(
      { paymentId, installmentId, input: { note: note.trim() || undefined } },
      {
        onSuccess: () => {
          setOpen(false)
          setNote("")
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm">
          Mark Paid
        </Button>
      }>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Installment #{order} as Paid?</DialogTitle>
          <DialogDescription>
            This confirms that payment for installment #{order} has been received.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label>Note (optional)</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Cash received at office"
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Saving…" : "Confirm Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
