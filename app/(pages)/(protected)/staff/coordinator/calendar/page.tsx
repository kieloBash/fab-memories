// app/(pages)/(protected)/staff/coordinator/calendar/page.tsx

import { ComingSoonPlaceholder } from "@/components/ui/coming-soon-placeholder"
import { CalendarRange } from "lucide-react"

export default function CoordinatorCalendarPage() {
  return (
    <ComingSoonPlaceholder
      title="Event calendar"
      subtitle="All events by date and status"
      icon={CalendarRange}
      description="A dedicated month-view calendar for coordinators. In the meantime, the calendar view is available from the Bookings page."
      plannedFeatures={[
        "Month view with all confirmed, pending, and cancelled events",
        "Quick filters by status and event type",
        "Click-through to booking detail",
      ]}
    />
  )
}
