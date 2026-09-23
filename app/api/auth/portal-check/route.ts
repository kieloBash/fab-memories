// app/api/auth/portal-check/route.ts
//
// POST /api/auth/portal-check   { "portal": "client" | "staff" }
//
// Called by the two login pages right after a successful Clerk sign-in, BEFORE they go to the dashboard.
// The role comes from OUR database (authoritative), not the session token (which can lag).
//
//   right portal → 200 { ok: true, destination }
//   wrong portal → 403 { code: "WRONG_PORTAL" } — the session is revoked at Clerk and a failed-LOGIN audit entry is written
//   no session   → 401 { code: "NO_SESSION" }
//   Clerk account with no row in our User table → the row is REPAIRED (lib/sync-user.ts) and the check continues;
//   if it cannot be repaired safely → 403 { code: "ACCOUNT_NOT_FOUND" }, session revoked, audited.
//   (Before this, such accounts got a bare 401 and the login page bounced them to "/", e.g. right after a
//   password reset — the reset flow skipped this check, so the missing row only surfaced at the next sign-in.)
//
// This enforces the login-page policy (staff only at /staff-login, clients only at /sign-in). It is not the
// authorization boundary — every route still checks the role itself.

import { logAction } from "@/lib/audit/log"
import { getCurrentClerkId, getCurrentDbUser, revokeCurrentSession } from "@/lib/clerk/auth"
import { ensureDbUser } from "@/lib/sync-user"
import { LOGIN_PATH, dashboardFor, portalFor, wrongPortalMessage } from "@/lib/clerk/portal"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({ portal: z.enum(["client", "staff"]) })

export async function POST(req: Request) {
  let actor = await getCurrentDbUser()
  if (!actor) {
    const clerkUserId = await getCurrentClerkId()
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 })

    // Signed in at Clerk, but no row in our User table — repair it (see lib/sync-user.ts for the safety rules).
    const synced = await ensureDbUser(clerkUserId)
    if (!synced.ok) {
      const revoked = await revokeCurrentSession()
      await logAction({
        userId: null, action: "LOGIN", module: "AUTH", status: "FAILURE",
        description: `Sign-in refused — the account record could not be found or linked${revoked ? ", session revoked" : ""}`,
        metadata: { event: "ACCOUNT_NOT_FOUND", reason: synced.reason, clerkUserId, sessionRevoked: revoked },
      })
      return NextResponse.json(
        { error: "We couldn't find your account details. Please contact support.", code: "ACCOUNT_NOT_FOUND" },
        { status: 403 },
      )
    }
    actor = synced.user
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "portal must be 'client' or 'staff'" }, { status: 422 })
  const attempted = parsed.data.portal

  // A deactivated account may not sign in anywhere.
  if (!actor.isActive) {
    const revoked = await revokeCurrentSession()
    await logAction({
      userId: actor.id, action: "LOGIN", module: "AUTH", status: "FAILURE",
      description: `${actor.role} account is deactivated — sign-in refused`,
      metadata: { event: "DEACTIVATED_SIGN_IN", attemptedPortal: attempted, sessionRevoked: revoked },
    })
    return NextResponse.json({ error: "This account has been deactivated. Please contact an administrator.", code: "ACCOUNT_DEACTIVATED" }, { status: 403 })
  }

  const actual = portalFor(actor.role)
  if (actual === attempted) {
    return NextResponse.json({ ok: true, destination: dashboardFor(actor.role) })
  }

  const revoked = await revokeCurrentSession()
  await logAction({
    userId: actor.id, action: "LOGIN", module: "AUTH", status: "FAILURE",
    description: `${actor.role} account attempted the ${attempted} sign-in — refused${revoked ? ", session revoked" : ""}`,
    metadata: { event: "WRONG_PORTAL", attemptedPortal: attempted, correctPortal: actual, role: actor.role, sessionRevoked: revoked },
  })
  return NextResponse.json(
    { error: wrongPortalMessage(actual), code: "WRONG_PORTAL", portal: actual, correctPath: LOGIN_PATH[actual] },
    { status: 403 },
  )
}
