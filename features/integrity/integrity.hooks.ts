// features/integrity/integrity.hooks.ts
"use client"

import { useQuery } from "@tanstack/react-query"
import { integrityKeys } from "./integrity.constants"
import { fetchIntegrityReport } from "./integrity.api"

/** Runs the checks on open, then only when asked (each run walks the whole audit chain). */
export function useIntegrityReport() {
  return useQuery({ queryKey: integrityKeys.report, queryFn: fetchIntegrityReport, staleTime: 0, refetchOnWindowFocus: false })
}
