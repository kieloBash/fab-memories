// features/reports/components/export-report-button.tsx
"use client"

import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ReportType } from "../reports.constants"
import { useExportReport } from "../reports.hooks"
import type { ReportFilterFormValues } from "../reports.schema"

export interface ExportTableOption { table?: string; label: string }

/**
 * FR-57 — one button per exportable table. Exports honour the current
 * filters (but not the page), and each click is recorded in the audit trail.
 */
export function ExportReportButtons({
  type, filters, tables,
}: {
  type: ReportType; filters: ReportFilterFormValues; tables: ExportTableOption[]
}) {
  const { mutate, isPending, variables } = useExportReport(type)
  return (
    <>
      {tables.map((t, i) => {
        const busy = isPending && variables?.table === t.table
        return (
          <Button
            key={t.table ?? "main"}
            variant={i === 0 ? "default" : "outline"}
            size="sm"
            disabled={isPending}
            onClick={() => mutate({ filters, table: t.table })}
          >
            {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}
            {busy ? "Exporting…" : t.label}
          </Button>
        )
      })}
    </>
  )
}

export const EXPORT_TABLES: Record<ReportType, ExportTableOption[]> = {
  bookings: [{ label: "Export CSV" }],
  payments: [{ label: "Export transactions" }, { table: "outstanding", label: "Export outstanding" }],
  vendors:  [{ label: "Export assignments" }, { table: "gaps", label: "Export gaps" }],
  staff:    [{ label: "Export events" }, { table: "coordinators", label: "Export coordinators" }],
  audit:    [{ label: "Export audit CSV" }],
}
