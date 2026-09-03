// app/(pages)/(protected)/staff/admin/audit/page.tsx

import { ComingSoonPlaceholder } from "@/components/ui/coming-soon-placeholder"
import { ShieldCheck } from "lucide-react"

export default function AdminAuditTrailPage() {
  return (
    <ComingSoonPlaceholder
      title="Audit trail"
      subtitle="Every action, every user, every timestamp"
      icon={ShieldCheck}
      moduleLabel="Module 7"
      description="A searchable, filterable, and immutable log of every action taken across the system. The logging itself already runs on every API route — this page is the viewer for it."
      plannedFeatures={[
        "Paginated table: timestamp, user, action, module, description, status",
        "Filter by date range, user, module, and action type",
        "CSV export for record-keeping",
        "Read-only — no user can modify or delete a log entry",
      ]}
    />
  )
}
