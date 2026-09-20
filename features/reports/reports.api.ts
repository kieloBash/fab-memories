// features/reports/reports.api.ts
"use client"

import axios from "axios"
import api from "@/lib/axios"
import { reportRoutes, type ReportType } from "./reports.constants"
import type { ReportFilterFormValues } from "./reports.schema"
import type { AdminDashboardSummary, RiskReport } from "./reports.types"

export async function fetchAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const { data } = await api.get<AdminDashboardSummary>(reportRoutes.dashboard)
  return data
}

export async function fetchRiskRegister(): Promise<RiskReport> {
  const { data } = await api.get<RiskReport>(reportRoutes.risks)
  return data
}

/** Drops empty values so they never reach the query string. */
function cleanParams(filters: ReportFilterFormValues): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") out[key] = value as string | number
  }
  return out
}

export async function fetchReport<T>(type: ReportType, filters: ReportFilterFormValues): Promise<T> {
  const { data } = await api.get<T>(reportRoutes.report(type), { params: cleanParams(filters) })
  return data
}

/**
 * Downloads a report as CSV. The server writes the EXPORT audit entry.
 * Paging is dropped: an export always contains the full filtered result.
 */
export async function downloadReport(
  type: ReportType,
  filters: ReportFilterFormValues,
  table?: string,
): Promise<{ filename: string }> {
  const { page: _page, pageSize: _pageSize, ...rest } = filters
  try {
    const res = await api.get<Blob>(reportRoutes.export(type), {
      params: { ...cleanParams(rest), format: "csv", ...(table ? { table } : {}) },
      responseType: "blob",
    })
    const disposition = String(res.headers["content-disposition"] ?? "")
    const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `${type}-report.csv`
    saveBlob(res.data, filename)
    return { filename }
  } catch (err) {
    // With responseType "blob", an error body arrives as a Blob — unwrap the { error } JSON.
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      const text = await err.response.data.text()
      try { throw new Error(JSON.parse(text).error ?? "Export failed") } catch (inner) {
        if (inner instanceof Error) throw inner
      }
    }
    throw err
  }
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
