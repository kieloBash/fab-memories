// features/bookings/components/booking-card.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, MapPin, Users } from "lucide-react"
import type { BookingWithRelations } from "../bookings.types"
import { EVENT_TYPE_LABELS } from "../bookings.constants"
import { BookingStatusBadge } from "./booking-status-badge"

interface BookingCardProps {
  booking: BookingWithRelations
  onClick?: () => void
}

export function BookingCard({ booking, onClick }: BookingCardProps) {
  const eventDate = new Date(booking.eventDate).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Card
      onClick={onClick}
      className={onClick ? "cursor-pointer transition-shadow hover:shadow-md" : undefined}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-base font-semibold leading-tight">
          {EVENT_TYPE_LABELS[booking.eventType]}
        </CardTitle>
        <BookingStatusBadge status={booking.status} />
      </CardHeader>

      <CardContent className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0" />
          <span>{eventDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0" />
          <span className="truncate">{booking.venue}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="size-4 shrink-0" />
          <span>{booking.guestCount} guests</span>
        </div>
        <p className="pt-1 font-medium text-foreground">
          {booking.package.name}
        </p>
      </CardContent>
    </Card>
  )
}
