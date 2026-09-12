// app/(pages)/(protected)/staff/admin/staff/page.tsx
"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageHeader } from "@/components/ui/page-header"
import { CoordinatorRosterTable } from "@/features/staff-assignments/components/coordinator-roster-table"
import { StaffingCalendar } from "@/features/staff-assignments/components/staffing-calendar"
import { Users, List, CalendarRange } from "lucide-react"
import { SPRING } from "@/lib/framer/framer-utils"
import { cn } from "@/lib/utils"

type ViewMode = "roster" | "calendar"

export default function AdminStaffSchedulingPage() {
  const [view, setView] = useState<ViewMode>("roster")

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="Staff scheduling"
        subtitle="Coordinator roster and event assignments"
        icon={Users}
        actions={
          <div className="relative flex rounded-xl border border-border overflow-hidden bg-white">
            {(["roster", "calendar"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "relative z-10 flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors duration-150",
                  view === v ? "text-white" : "text-text-sub hover:bg-background-blush",
                )}
              >
                {view === v && (
                  <motion.span
                    layoutId="admin-staff-view-toggle"
                    className="absolute inset-0 -z-10 bg-primary shadow-primary-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    aria-hidden="true"
                  />
                )}
                {v === "roster"
                  ? <><List size={13} aria-hidden="true" /> Roster</>
                  : <><CalendarRange size={13} aria-hidden="true" /> Calendar</>}
              </button>
            ))}
          </div>
        }
      />

      {view === "roster" ? (
        <>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-700">
            To assign a coordinator to a specific event, open that booking's detail page —
            the "Staff scheduling" panel there handles per-event assignment, task roles,
            backup designation, and conflict warnings.
          </div>
          <CoordinatorRosterTable />
        </>
      ) : (
        <StaffingCalendar bookingHref={(bookingId) => `/staff/admin/bookings/${bookingId}`} />
      )}
    </motion.div>
  )
}
