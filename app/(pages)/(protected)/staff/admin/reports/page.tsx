// app/(pages)/(protected)/staff/admin/reports/page.tsx

import { ComingSoonPlaceholder } from "@/components/ui/coming-soon-placeholder"
import { BarChart3 } from "lucide-react"

export default function AdminReportsPage() {
  return (
    <ComingSoonPlaceholder
      title="Reports"
      subtitle="Operational reports for decision support"
      icon={BarChart3}
      moduleLabel="Module 8"
      description="Five exportable report types generated from live system data, built to support proactive risk identification and evidence-based decisions."
      plannedFeatures={[
        "Booking and scheduling report",
        "Payment and transaction report with outstanding balances",
        "Vendor coordination report",
        "Staff scheduling report",
        "Audit trail summary report",
        "CSV / PDF export on every report",
      ]}
    />
  )
}
