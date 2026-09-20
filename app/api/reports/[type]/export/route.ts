// app/api/reports/[type]/export/route.ts

import { handleReportExport } from "@/features/reports/reports.handler"

type Params = { params: Promise<{ type: string }> }

/**
 * GET /api/reports/[type]/export?format=csv&table=<optional>&<same filters as the report>
 * Streams the full filtered result (up to 10,000 rows) as CSV and writes an
 * EXPORT/REPORT audit entry (FR-57 + FR-48).
 */
export async function GET(req: Request, { params }: Params) {
  const { type } = await params
  return handleReportExport(req, type)
}
