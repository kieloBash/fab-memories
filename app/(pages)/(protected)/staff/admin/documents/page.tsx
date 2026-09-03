// app/(pages)/(protected)/staff/admin/documents/page.tsx

import { ComingSoonPlaceholder } from "@/components/ui/coming-soon-placeholder"
import { FileText } from "lucide-react"

export default function AdminDocumentsPage() {
  return (
    <ComingSoonPlaceholder
      title="Documents"
      subtitle="Contracts, invoices, receipts, and event checklists"
      icon={FileText}
      moduleLabel="Module 6"
      description="Automatically generate and manage all key business documents, triggered by booking confirmations and payment verifications — no more manually drafting contracts in a Word doc."
      plannedFeatures={[
        "Auto-generated contract and welcome letter on booking confirmation",
        "Auto-generated invoice and receipt on payment verification",
        "All 8 event checklist types (guest list, suppliers directory, entourage list, crew meals, and more)",
        "Document template management",
      ]}
    />
  )
}
