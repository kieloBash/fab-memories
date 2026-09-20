// features/reports/reports.export.ts
//
// Server-side CSV builder for report exports (FR-57).
// Builds on the existing lib/csv-export `arrayToCsv`, and adds:
//   • CSV/formula-injection protection — free-text fields (venue, notes,
//     descriptions) are user-supplied; a cell starting with = + - @ would
//     execute as a formula when the file is opened in Excel/Sheets.
//   • a UTF-8 BOM so Excel renders "₱" and accented names correctly.
//   • header-only output for empty result sets (arrayToCsv returns "").

import { arrayToCsv, type CsvColumn } from "@/lib/csv-export"

const BOM = "\uFEFF"
const FORMULA_START = /^[=+\-@\t\r]/

function sanitizeCell(value: unknown): unknown {
  if (typeof value === "string" && FORMULA_START.test(value)) return `'${value}`
  return value
}

function escapeHeader(label: string): string {
  return /[",\n]/.test(label) ? `"${label.replace(/"/g, '""')}"` : label
}

export function buildCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  if (rows.length === 0) {
    return `${BOM}${columns.map((c) => escapeHeader(c.label)).join(",")}\n`
  }
  const safeRows = rows.map((row) =>
    Object.fromEntries(columns.map((c) => [c.key, sanitizeCell(row[c.key])])),
  )
  return `${BOM}${arrayToCsv(safeRows, columns)}\n`
}

/** Yes/No for boolean columns. */
export const yesNo = (v: boolean): string => (v ? "Yes" : "No")
