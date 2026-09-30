// app/(pages)/(protected)/staff/admin/users/page.tsx
"use client"

import { useUser } from "@clerk/nextjs"
import { motion } from "framer-motion"
import { UserCog } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { CreateStaffDialog } from "@/features/staff-accounts/components/create-staff-dialog"
import { StaffAccountsTable } from "@/features/staff-accounts/components/staff-accounts-table"
import { SPRING } from "@/lib/framer/framer-utils"

export default function AdminUsersPage() {
  const { user } = useUser()

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="flex flex-col gap-6">
      <PageHeader
        title="User accounts"
        subtitle="Manage coordinator and admin logins"
        icon={UserCog}
        actions={<CreateStaffDialog />}
      />
      <StaffAccountsTable currentUsername={user?.username} />
    </motion.div>
  )
}
