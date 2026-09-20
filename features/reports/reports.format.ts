// features/reports/reports.format.ts
//
// Display helpers shared by every report screen. Client-safe.
// Business dates are shown in Manila time regardless of the viewer's device clock.

import { REPORT_TIMEZONE } from "./reports.constants"

export const peso = (n: number): string =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

/** "YYYY-MM-DD" (a date-only value) → "Sep 19, 2026". Parsed as a local date so it never shifts a day. */
export const fmtYmd = (ymd: string): string =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })

export const fmtYmdShort = (ymd: string): string =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" })

/** ISO timestamp → "Sep 19, 2026, 3:04 PM" in Manila time. */
export const fmtDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("en-PH", {
    timeZone: REPORT_TIMEZONE, year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  })

export const fmtTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString("en-PH", { timeZone: REPORT_TIMEZONE, hour: "numeric", minute: "2-digit", second: "2-digit" })

/** "CANCELLATION_REQUESTED" → "Cancellation requested" */
export const humanize = (value: string): string => {
  const s = value.replace(/_/g, " ").toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: "Wedding", DEBUT: "Debut", CORPORATE: "Corporate", BIRTHDAY: "Birthday", OTHER: "Other",
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "muted"

export const bookingStatusVariant = (s: string): BadgeVariant =>
  s === "CONFIRMED" ? "success" : s === "PENDING" ? "warning" : s === "CANCELLED" ? "destructive" : "secondary"

export const paymentStatusVariant = (s: string): BadgeVariant =>
  s === "VERIFIED" ? "success" : s === "SUBMITTED" ? "warning" : s === "FLAGGED" ? "destructive" : "muted"

export const severityVariant = (s: "HIGH" | "MEDIUM" | "LOW"): BadgeVariant =>
  s === "HIGH" ? "destructive" : s === "MEDIUM" ? "warning" : "secondary"

/** Bar colours for status-keyed charts. */
export const STATUS_BAR: Record<string, string> = {
  CONFIRMED: "bg-emerald-500", PENDING: "bg-amber-400",
  CANCELLED: "bg-red-400", CANCELLATION_REQUESTED: "bg-orange-400",
}
