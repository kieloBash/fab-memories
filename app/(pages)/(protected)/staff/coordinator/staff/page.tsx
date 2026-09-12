// app/(pages)/(protected)/staff/coordinator/staff/page.tsx
"use client"

import { motion } from "framer-motion"
import { PageHeader } from "@/components/ui/page-header"
import { CoordinatorRosterTable } from "@/features/staff-assignments/components/coordinator-roster-table"
import { MyAssignmentsList } from "@/features/staff-assignments/components/my-assignments-list"
import { Users, ClipboardList } from "lucide-react"
import { SPRING } from "@/lib/framer/framer-utils"

export default function CoordinatorStaffSchedulingPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="Staff scheduling"
        subtitle="Your assignments and the coordinator roster"
        icon={Users}
      />

      {/* Self-view — pinned at top for the signed-in coordinator */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className="text-primary" aria-hidden="true" />
          <p className="text-[13px] font-semibold text-text-main">My assignments</p>
        </div>
        <MyAssignmentsList />
      </div>

      {/* Full roster — same view Admin sees, Coordinators can assign too */}
      {/* <div className="space-y-3 pt-2 border-t border-border">
        <p className="text-[13px] font-semibold text-text-main pt-2">Coordinator roster</p>
        <p className="text-[12px] text-text-muted -mt-2">
          To assign a coordinator to an event, open that booking's detail page.
        </p>
        <CoordinatorRosterTable />
      </div> */}
    </motion.div>
  )
}
