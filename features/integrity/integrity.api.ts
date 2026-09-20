// features/integrity/integrity.api.ts
"use client"

import api from "@/lib/axios"
import { integrityRoutes } from "./integrity.constants"
import type { IntegrityReport } from "./integrity.types"

export async function fetchIntegrityReport(): Promise<IntegrityReport> {
  const { data } = await api.get<IntegrityReport>(integrityRoutes.report)
  return data
}
