// app/api/audit/stats/route.ts

import { requireRole } from "@/lib/clerk/auth"
import { getAuditStats } from "@/features/audit/audit.query"
import { NextResponse } from "next/server"

/**
 * GET /api/audit/stats
 * Summary counts for the audit dashboard stat cards. ADMIN only.
 * Not logged as a "report access" itself — it's polled every 60s by
 * the page and would otherwise flood the log with near-duplicate
 * entries; the main /api/audit list endpoint already logs the
 * meaningful "someone opened the audit trail" event.
 */
export async function GET() {
  try { await requireRole(["ADMIN"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const stats = await getAuditStats()
  return NextResponse.json(stats)
}
