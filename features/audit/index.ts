// features/audit/index.ts

export {
  auditKeys, auditRoutes,
  AUDIT_ACTION_LABELS, AUDIT_ACTION_COLORS, AUDIT_MODULE_LABELS,
} from "./audit.constants"

export { auditFilterSchema } from "./audit.schema"
export type { AuditFilterInput } from "./audit.schema"

export type {
  AuditLogEntry, AuditLogFilters, AuditLogPage,
  AuditFilterOptions, AuditStats, ChainIntegrityResult,
} from "./audit.types"

export {
  fetchAuditLogs, fetchAuditFilterOptions, fetchAuditStats, verifyChainIntegrity,
} from "./audit.api"

export {
  useAuditLogs, useAuditFilterOptions, useAuditStats, useVerifyChainIntegrity,
} from "./audit.hooks"

// Server-only — import directly in route handlers, not through this barrel:
// export { getAuditLogs, getAuditFilterOptions, getAuditStats, verifyAuditChainIntegrity } from "./audit.query"
