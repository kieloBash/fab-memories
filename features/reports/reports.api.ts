// features/reports/reports.api.ts
"use client"

import api from "@/lib/axios"
import { reportRoutes } from "./reports.constants"
import type { AdminDashboardSummary } from "./reports.types"

export async function fetchAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const { data } = await api.get<AdminDashboardSummary>(reportRoutes.dashboard)
  return data
}
