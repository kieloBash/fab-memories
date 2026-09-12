// features/audit/audit.constants.ts

import type { AuditAction, AuditModule } from "@/app/generated/prisma/client"

export const auditKeys = {
  list:    (filters: Record<string, unknown>) => ["audit-logs", filters] as const,
  options: ["audit-filter-options"] as const,
  stats:   ["audit-stats"] as const,
  chain:   ["audit-chain-integrity"] as const,
}

export const auditRoutes = {
  logs:    "/audit",
  stats:   "/audit/stats",
  verify:  "/audit/verify",
} as const

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN:   "Login",
  LOGOUT:  "Logout",
  CREATE:  "Create",
  UPDATE:  "Update",
  DELETE:  "Delete",
  VERIFY:  "Verify",
  CONFIRM: "Confirm",
  DECLINE: "Decline",
  EXPORT:  "Export",
  VIEW:    "View",
}

/** Tailwind color pair (text, bg) per action — used by AuditActionBadge */
export const AUDIT_ACTION_COLORS: Record<AuditAction, { text: string; bg: string }> = {
  LOGIN:   { text: "text-emerald-700", bg: "bg-emerald-50" },
  LOGOUT:  { text: "text-text-muted",  bg: "bg-background-blush" },
  CREATE:  { text: "text-primary",     bg: "bg-primary-soft" },
  UPDATE:  { text: "text-blue-700",    bg: "bg-blue-50" },
  DELETE:  { text: "text-red-700",     bg: "bg-red-50" },
  VERIFY:  { text: "text-emerald-700", bg: "bg-emerald-50" },
  CONFIRM: { text: "text-emerald-700", bg: "bg-emerald-50" },
  DECLINE: { text: "text-orange-700",  bg: "bg-orange-50" },
  EXPORT:  { text: "text-indigo-700",  bg: "bg-indigo-50" },
  VIEW:    { text: "text-text-muted",  bg: "bg-background-blush" },
}

export const AUDIT_MODULE_LABELS: Record<AuditModule, string> = {
  AUTH:            "Authentication",
  USER_MANAGEMENT: "User Management",
  BOOKING:         "Booking",
  PAYMENT:         "Payment",
  VENDOR:          "Vendor",
  STAFF_SCHEDULE:  "Staff Scheduling",
  DOCUMENT:        "Document",
  REPORT:          "Report",
}
