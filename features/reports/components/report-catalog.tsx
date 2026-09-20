// features/reports/components/report-catalog.tsx
"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { BarChart3, CalendarDays, ChevronRight, CreditCard, ShieldCheck, Store, Users, type LucideIcon } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { SPRING } from "@/lib/framer/framer-utils"
import { REPORT_DESCRIPTIONS, REPORT_LABELS, REPORT_ROLES, type ReportType } from "../reports.constants"
import type { BasePath } from "./views/report-view-types"

const ICONS: Record<ReportType, LucideIcon> = {
  bookings: CalendarDays, payments: CreditCard, vendors: Store, staff: Users, audit: ShieldCheck,
}
const ORDER: ReportType[] = ["bookings", "payments", "vendors", "staff", "audit"]

/** Landing page: one card per report the signed-in role may open (FR-50 / FR-57). */
export function ReportCatalog({ basePath }: { basePath: BasePath }) {
  const role = basePath === "/staff/admin" ? "ADMIN" : "COORDINATOR"
  const types = ORDER.filter((t) => REPORT_ROLES[t].includes(role))

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="flex flex-col gap-6">
      <PageHeader title="Reports" subtitle="Live operational reports for decision support — filter, review and export" icon={BarChart3} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {types.map((t) => {
          const Icon = ICONS[t]
          return (
            <Link
              key={t}
              href={`${basePath}/reports/${t}`}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
                  <Icon size={19} className="text-primary" aria-hidden="true" />
                </div>
                <ChevronRight size={16} className="text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-text-main">{REPORT_LABELS[t]}</h2>
                <p className="mt-1 text-[12px] leading-relaxed text-text-muted">{REPORT_DESCRIPTIONS[t]}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <p className="text-[12px] text-text-muted">
        Every report view and export is recorded in the audit trail. Exports are CSV and follow your current filters.
      </p>
    </motion.div>
  )
}
