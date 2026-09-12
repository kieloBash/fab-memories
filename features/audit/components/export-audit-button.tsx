// features/audit/components/export-audit-button.tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { fetchAuditLogs } from "@/features/audit"
import type { AuditFilterInput } from "@/features/audit"
import { arrayToCsv, downloadCsv } from "@/lib/csv-export"

const EXPORT_LIMIT = 10000

interface ExportAuditButtonProps {
  filters: AuditFilterInput
}

/**
 * FR-51 — exports the FULL filtered result set (not just the currently
 * visible page) as CSV. Includes each entry's chain sequence number and
 * hash, so an exported record remains independently checkable against
 * the live system later — the export itself carries its position in
 * the tamper-evident chain, not just a plain data dump.
 */
export function ExportAuditButton({ filters }: ExportAuditButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const page = await fetchAuditLogs({ ...filters, page: 1, pageSize: EXPORT_LIMIT })

      const csv = arrayToCsv(
        page.entries.map((e) => ({
          sequence: e.sequence,
          timestamp: e.createdAt,
          user: e.userName ?? "System",
          action: e.action,
          module: e.module,
          description: e.description,
          status: e.status,
          hash: e.hash,
          previousHash: e.previousHash ?? "GENESIS",
        })),
        [
          { key: "sequence",     label: "Sequence #" },
          { key: "timestamp",    label: "Timestamp" },
          { key: "user",         label: "User" },
          { key: "action",       label: "Action" },
          { key: "module",       label: "Module" },
          { key: "description",  label: "Description" },
          { key: "status",       label: "Status" },
          { key: "hash",         label: "Entry Hash (SHA-256)" },
          { key: "previousHash", label: "Previous Hash" },
        ],
      )

      const dateLabel = new Date().toISOString().slice(0, 10)
      downloadCsv(`audit-trail-${dateLabel}.csv`, csv)

      toast.success(`Exported ${page.entries.length} audit log entries`, {
        description: page.total > EXPORT_LIMIT
          ? `Showing the first ${EXPORT_LIMIT.toLocaleString()} of ${page.total.toLocaleString()} matching entries — narrow your filters for a complete export.`
          : undefined,
      })
    } catch {
      toast.error("Export failed. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
      <Download size={13} aria-hidden="true" />
      {exporting ? "Exporting…" : "Export CSV"}
    </Button>
  )
}
