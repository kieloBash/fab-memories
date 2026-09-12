// features/audit/audit.api.ts
"use client"

import api from "@/lib/axios"
import { auditRoutes } from "./audit.constants"
import type {
  AuditLogPage, AuditFilterOptions, AuditStats, ChainIntegrityResult,
} from "./audit.types"
import type { AuditFilterInput } from "./audit.schema"

export async function fetchAuditLogs(filters: AuditFilterInput): Promise<AuditLogPage> {
  const { data } = await api.get<AuditLogPage>(auditRoutes.logs, { params: filters })
  return data
}

export async function fetchAuditFilterOptions(): Promise<AuditFilterOptions> {
  const { data } = await api.get<AuditFilterOptions>(auditRoutes.logs, {
    params: { options: "true" },
  })
  return data
}

export async function fetchAuditStats(): Promise<AuditStats> {
  const { data } = await api.get<AuditStats>(auditRoutes.stats)
  return data
}

/** Triggers a full chain walk server-side — deliberately not cached/automatic. */
export async function verifyChainIntegrity(): Promise<ChainIntegrityResult> {
  const { data } = await api.get<ChainIntegrityResult>(auditRoutes.verify)
  return data
}
