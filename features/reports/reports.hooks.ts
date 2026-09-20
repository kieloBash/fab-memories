// features/reports/reports.hooks.ts
"use client"

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/axios"
import { reportKeys, type ReportType } from "./reports.constants"
import { downloadReport, fetchAdminDashboardSummary, fetchReport, fetchRiskRegister } from "./reports.api"
import type { ReportFilterFormValues } from "./reports.schema"

/**
 * Admin dashboard summary (FR-58). Meant to feel "real-time": refetches every
 * 30 s while the tab is visible, and immediately when the tab regains focus.
 * (The server de-duplicates the resulting audit entries — see reports.logging.ts.)
 */
export function useAdminDashboardSummary() {
  return useQuery({
    queryKey: reportKeys.dashboard,
    queryFn:  fetchAdminDashboardSummary,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}

/** Full risk register — fetched only when the "view all" dialog is opened. */
export function useRiskRegister(enabled: boolean) {
  return useQuery({
    queryKey: reportKeys.risks,
    queryFn:  fetchRiskRegister,
    enabled,
    staleTime: 0,
  })
}

/** Any report. Keeps the previous result on screen while new filters load. */
export function useReport<T>(type: ReportType, filters: ReportFilterFormValues, enabled = true) {
  return useQuery({
    queryKey: reportKeys.report(type, filters),
    queryFn:  () => fetchReport<T>(type, filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useExportReport(type: ReportType) {
  return useMutation({
    mutationFn: ({ filters, table }: { filters: ReportFilterFormValues; table?: string }) =>
      downloadReport(type, filters, table),
    onSuccess: ({ filename }) => toast.success(`Downloaded ${filename}`),
    onError:   (error) => toast.error(getApiErrorMessage(error)),
  })
}
