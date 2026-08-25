// features/bookings/components/confirm-booking-dialog.tsx
"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useUpdateBookingStatus } from "../bookings.hooks"

interface ConfirmBookingDialogProps {
  bookingId: string
  eventDate: string
  onSuccess?: () => void
}

export function ConfirmBookingDialog({
  bookingId,
  eventDate,
  onSuccess,
}: ConfirmBookingDialogProps) {
  const { mutate, isPending } = useUpdateBookingStatus()

  const handleConfirm = () => {
    mutate(
      { id: bookingId, input: { status: "CONFIRMED" } },
      { onSuccess },
    )
  }

  const formattedDate = new Date(eventDate).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <AlertDialog>
      <AlertDialogTrigger render={
        <Button variant="default" disabled={isPending}>
          Confirm Booking
        </Button>
      }>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            This will confirm the event on <strong>{formattedDate}</strong>. The
            date will be marked as unavailable for other bookings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Confirming…" : "Yes, confirm booking"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
