// features/audit/components/export-audit-button.tsx
"use client"

import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AuditFilterInput } from "@/features/audit"
import { useExportReport } from "@/features/reports/reports.hooks"

/**
 * FR-51 — exports the FULL filtered audit trail as CSV, including each entry's sequence number and hash,
 * so an exported record can be checked against the live chain later.
 *
 * MODULE 9: this used to build the CSV in the browser from the list API. Two problems:
 *   1. it asked for pageSize 10,000 but that endpoint caps pageSize at 100 — so it never worked; and
 *   2. no EXPORT entry was ever written to the audit trail, and cells were not protected against
 *      spreadsheet formula injection.
 * It now downloads the server-side export (GET /api/reports/audit/export), which is logged, escaped,
 * and limited to 10,000 rows. Note: date filters there use Manila calendar days.
 */
export function ExportAuditButton({ filters }: { filters: AuditFilterInput }) {
  const { mutate, isPending } = useExportReport("audit")

  const handleExport = () =>
    mutate({
      filters: {
        from: filters.from, to: filters.to, userId: filters.userId,
        module: filters.module, action: filters.action, status: filters.status, search: filters.search,
      },
    })

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
      {isPending ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Download size={13} aria-hidden="true" />}
      {isPending ? "Exporting…" : "Export CSV"}
    </Button>
  )
}
