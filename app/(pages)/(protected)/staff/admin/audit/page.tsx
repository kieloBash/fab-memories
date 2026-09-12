// app/(pages)/(protected)/staff/admin/audit/page.tsx
"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useAuditLogs } from "@/features/audit"
import type { AuditFilterInput } from "@/features/audit"
import { AuditStatCards } from "@/features/audit/components/audit-stat-cards"
import { ChainIntegrityBadge } from "@/features/audit/components/chain-integrity-badge"
import { AuditFiltersBar } from "@/features/audit/components/audit-filters-bar"
import { AuditLogTable } from "@/features/audit/components/audit-log-table"
import { ExportAuditButton } from "@/features/audit/components/export-audit-button"
import { PageHeader } from "@/components/ui/page-header"
import { ShieldCheck } from "lucide-react"
import { SPRING } from "@/lib/framer/framer-utils"

export default function AuditTrailPage() {
  const [filters, setFilters] = useState<AuditFilterInput>({ page: 1, pageSize: 25 })
  const { data, isLoading } = useAuditLogs(filters)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="Audit trail"
        subtitle="Every action, every user, cryptographically chained"
        icon={ShieldCheck}
        actions={<ExportAuditButton filters={filters} />}
      />

      <AuditStatCards />

      <ChainIntegrityBadge />

      <AuditFiltersBar filters={filters} onChange={setFilters} />

      <AuditLogTable
        data={data}
        isLoading={isLoading}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
      />
    </motion.div>
  )
}
