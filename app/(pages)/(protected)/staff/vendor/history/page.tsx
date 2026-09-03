// app/(pages)/(protected)/staff/vendor/history/page.tsx

import { ComingSoonPlaceholder } from "@/components/ui/coming-soon-placeholder"
import { CalendarRange } from "lucide-react"

export default function VendorHistoryPage() {
  return (
    <ComingSoonPlaceholder
      title="History"
      subtitle="Your past assigned events"
      icon={CalendarRange}
      description="A record of every event you've worked with Fab Memories Events, including completed and cancelled assignments."
      plannedFeatures={[
        "Past assigned events, most recent first",
        "Filter by event type and date range",
        "Quick reference for repeat coordination",
      ]}
    />
  )
}
