// app/(pages)/(protected)/portal/documents/page.tsx

import { ComingSoonPlaceholder } from "@/components/ui/coming-soon-placeholder"
import { FileText } from "lucide-react"

export default function ClientDocumentsPage() {
  return (
    <ComingSoonPlaceholder
      title="Documents"
      subtitle="Your contracts, invoices, receipts, and checklists"
      icon={FileText}
      moduleLabel="Module 6"
      description="Once your booking is confirmed, your contract and welcome letter will appear here automatically. Invoices and receipts follow after each payment is verified."
      plannedFeatures={[
        "Download your contract and welcome letter",
        "Download invoices and official receipts",
        "Track which documents are ready",
      ]}
    />
  )
}
