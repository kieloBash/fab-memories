// app/(pages)/(protected)/(staff)/staff/admin/bookings/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useBookings } from "@/features/bookings"
import { BookingCard } from "@/features/bookings/components/booking-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { BookingStatus } from "@/app/generated/prisma/client"

export default function AdminBookingsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<BookingStatus | undefined>()
  const { data: bookings, isLoading, isError } = useBookings(status ? { status } : undefined)

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <Select
          value={status ?? "ALL"}
          onValueChange={(v) => setStatus(v === "ALL" ? undefined : (v as BookingStatus))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading bookings…</p>}
      {isError && <p className="text-destructive">Failed to load bookings.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bookings?.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onClick={() => router.push(`/staff/admin/bookings/${booking.id}`)}
          />
        ))}
      </div>

      {bookings?.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No bookings found.</p>
      )}
    </div>
  )
}
