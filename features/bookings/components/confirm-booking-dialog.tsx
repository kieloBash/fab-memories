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
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { CalendarCheck2 } from "lucide-react"
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
    mutate({ id: bookingId, input: { status: "CONFIRMED" } }, { onSuccess })
  }

  const formattedDate = new Date(eventDate).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  })

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="default" disabled={isPending}>
            <CalendarCheck2 size={14} aria-hidden="true" />
            Confirm booking
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-emerald-50">
            <CalendarCheck2 size={28} className="text-emerald-600" aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Confirm this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            This will confirm the event on{" "}
            <span className="font-semibold text-text-main">{formattedDate}</span>.
            The date will be marked as unavailable for other bookings.
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
