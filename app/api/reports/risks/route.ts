// app/api/reports/risks/route.ts

import { logReportView } from "@/features/reports/reports.logging"
import { getRiskIndicators } from "@/features/reports/reports.risk"
import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { NextResponse } from "next/server"

/**
 * GET /api/reports/risks
 * The full risk register (up to 100 items). The dashboard only carries the top 8;
 * this backs the "View all risks" dialog. ADMIN only. The audit-chain check is
 * run fresh, because opening the register is a deliberate act.
 */
export async function GET() {
  try { await requireRole(["ADMIN"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor || !actor.isActive) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const risks = await getRiskIndicators({ basePath: "/staff/admin", forceChainCheck: true })

  await logReportView({
    userId: actor.id,
    description: `${actor.fullName} viewed the full risk register`,
    metadata: { total: risks.summary.total },
  })

  return NextResponse.json(risks, { headers: { "Cache-Control": "no-store" } })
}
