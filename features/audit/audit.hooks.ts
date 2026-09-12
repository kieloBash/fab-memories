// features/audit/audit.hooks.ts
"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import { auditKeys } from "./audit.constants"
import {
  fetchAuditLogs, fetchAuditFilterOptions, fetchAuditStats, verifyChainIntegrity,
} from "./audit.api"
import type { AuditFilterInput } from "./audit.schema"

export function useAuditLogs(filters: AuditFilterInput) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn:  () => fetchAuditLogs(filters),
  })
}

export function useAuditFilterOptions() {
  return useQuery({
    queryKey: auditKeys.options,
    queryFn:  fetchAuditFilterOptions,
    staleTime: 5 * 60 * 1000, // rarely changes within a session
  })
}

export function useAuditStats() {
  return useQuery({
    queryKey: auditKeys.stats,
    queryFn:  fetchAuditStats,
    refetchInterval: 60_000,
  })
}

/**
 * Chain verification is user-initiated (a "Run integrity check" button),
 * not automatic — an O(n) full-table walk on every dashboard load isn't
 * necessary, and a deliberate click makes the moment feel appropriately
 * significant rather than just another background spinner.
 */
export function useVerifyChainIntegrity() {
  return useMutation({
    mutationFn: verifyChainIntegrity,
  })
}
