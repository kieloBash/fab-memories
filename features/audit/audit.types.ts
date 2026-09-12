// features/audit/audit.types.ts

import type { AuditAction, AuditModule, AuditStatus } from "@/app/generated/prisma/client"

export interface AuditLogEntry {
  id:           string
  sequence:     number
  userId:       string | null
  userName:     string | null // resolved from User.fullName; "System" when null
  userRole:     string | null
  action:       AuditAction
  module:       AuditModule
  description:  string
  status:       AuditStatus
  metadata:     Record<string, unknown> | null
  previousHash: string | null
  hash:         string
  createdAt:    string
}

export interface AuditLogFilters {
  from?:     string
  to?:       string
  userId?:   string
  module?:   AuditModule
  action?:   AuditAction
  status?:   AuditStatus
  search?:   string
  page?:     number
  pageSize?: number
}

export interface AuditLogPage {
  entries:    AuditLogEntry[]
  total:      number
  page:       number
  pageSize:   number
  totalPages: number
}

export interface AuditFilterOptions {
  users: { id: string; fullName: string }[]
}

export interface AuditStats {
  totalEntries:     number
  entriesToday:     number
  failureCount:     number
  mostActiveModule: { module: AuditModule; count: number } | null
}

/** Result of walking the full hash chain and recomputing every entry's hash. */
export interface ChainIntegrityResult {
  isValid:          boolean
  totalEntries:     number
  brokenAtSequence: number | null
  reason:           string | null
  verifiedAt:       string
}
