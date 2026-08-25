// features/bookings/components/withdraw-booking-dialog.tsx
"use client"

import { useState } from "react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useDeleteBooking } from "../bookings.hooks"

interface WithdrawBookingDialogProps {
  bookingId: string
  onSuccess?: () => void
}

export function WithdrawBookingDialog({ bookingId, onSuccess }: WithdrawBookingDialogProps) {
  const { mutate, isPending } = useDeleteBooking()

  const handleWithdraw = () => {
    mutate(bookingId, { onSuccess })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={
        <Button
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
        >
          <Trash2 size={14} aria-hidden="true" />
          Withdraw request
        </Button>
      }>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw booking request?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove your booking request. This action cannot be undone.
            You can always submit a new request afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep request</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleWithdraw}
            disabled={isPending}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {isPending ? "Withdrawing…" : "Yes, withdraw"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
