// app/api/reports/bookings/route.ts

import { handleReportGet } from "@/features/reports/reports.handler"

/**
 * GET /api/reports/bookings
 * Auth, filter validation, audit logging and error handling are shared by
 * all five reports — see features/reports/reports.handler.ts.
 */
export async function GET(req: Request) {
  return handleReportGet(req, "bookings")
}
