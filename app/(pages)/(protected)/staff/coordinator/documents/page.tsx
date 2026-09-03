// app/(pages)/(protected)/staff/coordinator/documents/page.tsx

import { ComingSoonPlaceholder } from "@/components/ui/coming-soon-placeholder"
import { FileText } from "lucide-react"

export default function CoordinatorDocumentsPage() {
  return (
    <ComingSoonPlaceholder
      title="Documents"
      subtitle="Contracts, invoices, receipts, and event checklists"
      icon={FileText}
      moduleLabel="Module 6"
      description="Automatically generated business documents will appear here, scoped to the events you coordinate."
      plannedFeatures={[
        "View contracts and welcome letters for your assigned events",
        "View invoices and receipts",
        "Download event checklists",
      ]}
    />
  )
}
