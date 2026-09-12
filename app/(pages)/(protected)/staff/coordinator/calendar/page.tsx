// app/(pages)/(protected)/staff/coordinator/calendar/page.tsx
"use client"

import { motion } from "framer-motion"
import { PageHeader } from "@/components/ui/page-header"
import { StaffingCalendar } from "@/features/staff-assignments/components/staffing-calendar"
import { CalendarRange } from "lucide-react"
import { SPRING } from "@/lib/framer/framer-utils"

export default function CoordinatorCalendarPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="Event calendar"
        subtitle="All events by date, color-coded by staffing status"
        icon={CalendarRange}
      />

      <StaffingCalendar bookingHref={(bookingId) => `/staff/coordinator/bookings/${bookingId}`} />
    </motion.div>
  )
}
