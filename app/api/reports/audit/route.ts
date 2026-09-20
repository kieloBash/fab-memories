// app/api/reports/audit/route.ts

import { handleReportGet } from "@/features/reports/reports.handler"

/**
 * GET /api/reports/audit
 * Auth, filter validation, audit logging and error handling are shared by
 * all five reports — see features/reports/reports.handler.ts.
 */
export async function GET(req: Request) {
  return handleReportGet(req, "audit")
}
