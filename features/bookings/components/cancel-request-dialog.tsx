// features/bookings/components/cancel-request-dialog.tsx
"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle } from "lucide-react"
import { useState } from "react"
import { useRequestCancellation } from "../bookings.hooks"

interface CancelRequestDialogProps {
  bookingId: string
  onSuccess?: () => void
}

export function CancelRequestDialog({ bookingId, onSuccess }: CancelRequestDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const { mutate, isPending } = useRequestCancellation()

  const handleSubmit = () => {
    if (reason.trim().length < 10) return
    mutate(
      { id: bookingId, input: { reason: reason.trim() } },
      {
        onSuccess: () => {
          setOpen(false)
          setReason("")
          onSuccess?.()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700">
          <AlertCircle size={14} aria-hidden="true" />
          Request cancellation
        </Button>
      }>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request booking cancellation</DialogTitle>
          <DialogDescription>
            Your request will be reviewed by our team. We'll be in touch regarding any refund
            eligibility based on your contract terms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="cancel-reason">
            Reason for cancellation
            <span className="ml-1 text-text-muted text-[11px]">(min. 10 characters)</span>
          </Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please explain why you need to cancel this booking…"
            rows={4}
          />
          <p className="text-[11px] text-text-muted text-right">{reason.length} / 500</p>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[12px] text-amber-700">
            This does not immediately cancel your booking. Staff will review your request
            and contact you to discuss next steps.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep booking
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending || reason.trim().length < 10}
          >
            {isPending ? "Submitting…" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
