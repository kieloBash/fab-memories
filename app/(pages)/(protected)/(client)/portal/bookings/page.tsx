// app/(pages)/(protected)/(client)/portal/bookings/page.tsx
"use client"

import { useRouter } from "next/navigation"
import { useBookings } from "@/features/bookings"
import { BookingCard } from "@/features/bookings/components/booking-card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function ClientBookingsPage() {
  const router = useRouter()
  const { data: bookings, isLoading, isError } = useBookings()

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <Button onClick={() => router.push("/portal/bookings/new")}>
          <Plus className="mr-2 size-4" /> New Booking
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading your bookings…</p>}
      {isError && <p className="text-destructive">Failed to load bookings.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {bookings?.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onClick={() => router.push(`/portal/bookings/${booking.id}`)}
          />
        ))}
      </div>

      {bookings?.length === 0 && (
        <div className="py-16 text-center space-y-4">
          <p className="text-muted-foreground">You have no bookings yet.</p>
          <Button onClick={() => router.push("/portal/bookings/new")}>
            Request a Booking
          </Button>
        </div>
      )}
    </div>
  )
}
