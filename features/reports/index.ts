// features/reports/index.ts

export { reportKeys, reportRoutes } from "./reports.constants"

export type {
  AdminDashboardSummary, NeedsAttentionItem, UpcomingEventSummary,
} from "./reports.types"

export { fetchAdminDashboardSummary } from "./reports.api"

export { useAdminDashboardSummary } from "./reports.hooks"

// Server-only — import directly in route handlers, not through this barrel:
// export { getAdminDashboardSummary } from "./reports.query"
