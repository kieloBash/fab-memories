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
import { useUpdateBookingStatus } from "../bookings.hooks"

interface CancelBookingDialogProps {
  bookingId: string
  onSuccess?: () => void
}

export function CancelBookingDialog({ bookingId, onSuccess }: CancelBookingDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const { mutate, isPending } = useUpdateBookingStatus()

  const handleCancel = () => {
    if (!reason.trim()) return

    mutate(
      {
        id: bookingId,
        input: { status: "CANCELLED", cancellationReason: reason.trim() },
      },
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
        <Button variant="destructive">Cancel Booking</Button>
      }>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please provide a reason for the
            cancellation so the client can be informed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reason">Cancellation reason</Label>
          <Textarea
            id="reason"
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
