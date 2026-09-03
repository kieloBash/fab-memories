// app/(pages)/(protected)/staff/admin/staff/page.tsx

import { ComingSoonPlaceholder } from "@/components/ui/coming-soon-placeholder"
import { Users } from "lucide-react"

export default function AdminStaffSchedulingPage() {
  return (
    <ComingSoonPlaceholder
      title="Staff scheduling"
      subtitle="Coordinator roster and event assignments"
      icon={Users}
      moduleLabel="Module 5"
      description="Assign coordinators to events using guest-count-based staffing ratios, designate backups, and get warned about scheduling conflicts before they happen."
      plannedFeatures={[
        "Coordinator roster with availability and current assignment load",
        "Automatic staffing recommendation (4–5 coordinators up to 50 guests, 7–8 for 51–150, 8–12 for 150+)",
        "Backup coordinator designation per event",
        "Conflict detection when a coordinator is double-booked on the same date",
      ]}
    />
  )
}
