// features/bookings/components/cancel-booking-dialog.tsx
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, XCircle } from "lucide-react"
import { useUpdateBookingStatus } from "../bookings.hooks"

interface CancelBookingDialogProps {
  bookingId: string
  onSuccess?: () => void
}

export function CancelBookingDialog({ bookingId, onSuccess }: CancelBookingDialogProps) {
  const [open, setOpen]     = useState(false)
  const [reason, setReason] = useState("")
  const { mutate, isPending } = useUpdateBookingStatus()

  const handleCancel = () => {
    if (!reason.trim()) return
    mutate(
      { id: bookingId, input: { status: "CANCELLED", cancellationReason: reason.trim() } },
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
      <DialogTrigger
        render={
          <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700">
            <XCircle size={14} aria-hidden="true" />
            Cancel booking
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          {/* Icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 mb-1">
            <AlertCircle size={20} className="text-red-500" aria-hidden="true" />
          </div>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please provide a reason so the client
            can be informed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="cancel-reason">Cancellation reason</Label>
          <Textarea
            id="cancel-reason"
            placeholder="e.g. Venue unavailable, scheduling conflict…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Go back
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? "Cancelling…" : "Cancel booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
