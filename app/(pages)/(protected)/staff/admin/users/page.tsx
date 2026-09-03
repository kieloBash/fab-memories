// app/(pages)/(protected)/staff/admin/users/page.tsx

import { ComingSoonPlaceholder } from "@/components/ui/coming-soon-placeholder"
import { UserCog } from "lucide-react"

export default function AdminUsersPage() {
  return (
    <ComingSoonPlaceholder
      title="User accounts"
      subtitle="Manage coordinator, vendor, and admin logins"
      icon={UserCog}
      description="Create and manage staff accounts (Admin, Coordinator, Vendor) directly from the dashboard instead of through the Clerk console."
      plannedFeatures={[
        "Create coordinator and vendor staff accounts",
        "Deactivate or reactivate a staff account",
        "View last login and account status",
        "Role reassignment",
      ]}
    />
  )
}
