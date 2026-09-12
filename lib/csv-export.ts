// lib/csv-export.ts

export interface CsvColumn {
  key:   string
  label: string
}

/**
 * Converts an array of objects to a CSV string. Values containing a
 * comma, quote, or newline are quoted and any internal quotes escaped,
 * per standard CSV rules.
 */
export function arrayToCsv(
  rows: Record<string, unknown>[],
  columns?: CsvColumn[],
): string {
  if (rows.length === 0) return ""

  const cols = columns ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }))

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return ""
    const s = String(val)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const header = cols.map((c) => escape(c.label)).join(",")
  const body = rows
    .map((row) => cols.map((c) => escape(row[c.key])).join(","))
    .join("\n")

  return `${header}\n${body}`
}

/** Triggers a browser download of the given CSV content. Client-side only. */
export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
