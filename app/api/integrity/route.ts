// app/api/integrity/route.ts

import { getIntegrityReport } from "@/features/integrity/integrity.query"
import { logReportView } from "@/features/reports/reports.logging"
import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { isAccountBlocked } from "@/lib/security/active-check"
import { NextResponse } from "next/server"

/** GET /api/integrity — live system-integrity checks. ADMIN only. */
export async function GET() {
  try { await requireRole(["ADMIN"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor || isAccountBlocked(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const report = await getIntegrityReport()

  await logReportView({
    userId: actor.id,
    description: `${actor.role} viewed the system integrity checks (${report.overall})`,
    metadata: { overall: report.overall, checks: Object.fromEntries(report.checks.map((c) => [c.id, c.status])) },
  })

  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } })
}
