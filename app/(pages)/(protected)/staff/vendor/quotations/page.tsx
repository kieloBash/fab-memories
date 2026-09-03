// app/(pages)/(protected)/staff/vendor/quotations/page.tsx

import { ComingSoonPlaceholder } from "@/components/ui/coming-soon-placeholder"
import { FileText } from "lucide-react"

export default function VendorQuotationsPage() {
  return (
    <ComingSoonPlaceholder
      title="Quotations"
      subtitle="Submit and track your service quotations"
      icon={FileText}
      description="Submit a formal quotation for an assigned event and track whether it's been reviewed by the coordinator."
      plannedFeatures={[
        "Submit a quotation amount and note for an assigned event",
        "Track quotation status",
        "View quotation history per event",
      ]}
    />
  )
}
