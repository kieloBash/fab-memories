// app/api/audit/verify/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { verifyAuditChainIntegrity } from "@/features/audit/audit.query"
import { NextResponse } from "next/server"

/**
 * GET /api/audit/verify
 * Walks the entire hash chain and confirms every entry's stored hash
 * matches its recomputed value and correctly chains to the previous
 * entry. ADMIN only. Deliberately not cached and not polled — this is
 * a user-initiated action (see ChainIntegrityBadge), and the act of
 * running a verification is itself logged, so there's a permanent
 * record of who checked the chain's integrity and when — including
 * the result.
 */
export async function GET() {
  try { await requireRole(["ADMIN"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const result = await verifyAuditChainIntegrity()

  const actor = await getCurrentDbUser()
  await logAction({
    userId: actor?.id ?? null,
    action: "VIEW",
    module: "REPORT",
    description: `${actor?.fullName ?? "Admin"} ran a full audit chain integrity check — result: ${result.isValid ? "VALID" : "BROKEN"}`,
    status: result.isValid ? "SUCCESS" : "FAILURE",
    metadata: {
      totalEntries: result.totalEntries,
      brokenAtSequence: result.brokenAtSequence,
    },
  })

  return NextResponse.json(result)
}
