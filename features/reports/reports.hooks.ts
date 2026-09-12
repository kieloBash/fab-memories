// features/reports/reports.hooks.ts
"use client"

import { useQuery } from "@tanstack/react-query"
import { reportKeys } from "./reports.constants"
import { fetchAdminDashboardSummary } from "./reports.api"

/**
 * Admin dashboard summary (FR-58). Short staleTime/refetch interval since
 * this is meant to feel "real-time" per spec — refetches every 60s while
 * the tab is active.
 */
export function useAdminDashboardSummary() {
  return useQuery({
    queryKey: reportKeys.dashboard,
    queryFn:  fetchAdminDashboardSummary,
    refetchInterval: 60_000,
  })
}
