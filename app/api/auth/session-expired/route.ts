// app/api/auth/session-expired/route.ts
//
// POST /api/auth/session-expired
//
// Called by a login page that was reached with ?error=SESSION_EXPIRED while the browser still holds the (too old)
// Clerk session. proxy.ts sends expired sessions there; this route ENDS the session properly:
//
//   still within SESSION_MAX_AGE → 409 { code: "NOT_EXPIRED" }   nothing happens (a crafted link cannot log anyone out)
//   age unknown (no fva claim)   → 409 { code: "AGE_UNKNOWN" }   nothing happens
//   expired                      → session revoked at Clerk + LOGOUT audit entry → 200 { ok: true, revoked }
//   already ended at Clerk       → 200 { ok: true, revoked: false, alreadyEnded: true } — no second audit entry
//   no session                   → 401 { code: "NO_SESSION" }
//
// proxy.ts lets expired sessions reach THIS route only (every other API route answers 401 SESSION_EXPIRED).

import { logAction } from "@/lib/audit/log"
import { getCurrentDbUser, revokeCurrentSession } from "@/lib/clerk/auth"
import { clerkClient } from "@/lib/clerk/client"
import { formatMinutes, getSessionMaxAgeMinutes, isSessionExpired, sessionAgeMinutes } from "@/lib/security/session-policy"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function POST() {
  const { userId, sessionId, factorVerificationAge } = await auth()
  if (!userId || !sessionId) return NextResponse.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 })

  const maxAgeMinutes = getSessionMaxAgeMinutes()
  const expired = isSessionExpired(factorVerificationAge, maxAgeMinutes)
  if (expired === null) return NextResponse.json({ error: "Session age is unknown", code: "AGE_UNKNOWN" }, { status: 409 })
  if (!expired) return NextResponse.json({ error: "Session has not expired", code: "NOT_EXPIRED" }, { status: 409 })

  // Several open tabs can all land here — only the first one ends the session and writes the audit entry.
  let alreadyEnded = false
  try {
    const clerk = await clerkClient()
    const session = await clerk.sessions.getSession(sessionId)
    alreadyEnded = session.status !== "active"
  } catch {
    /* Clerk unreachable — still try to revoke below */
  }
  if (alreadyEnded) return NextResponse.json({ ok: true, revoked: false, alreadyEnded: true })

  const revoked = await revokeCurrentSession()
  const actor = await getCurrentDbUser()
  await logAction({
    userId: actor?.id ?? null,
    action: "LOGOUT",
    module: "AUTH",
    status: "SUCCESS",
    description: `${actor?.role ?? "Unknown"} session ended — older than the ${formatMinutes(maxAgeMinutes)} maximum session age${revoked ? "" : " (Clerk revoke failed; browser signed out)"}`,
    metadata: {
      event: "SESSION_EXPIRED",
      maxAgeMinutes,
      sessionAgeMinutes: sessionAgeMinutes(factorVerificationAge),
      sessionRevoked: revoked,
    },
  })

  return NextResponse.json({ ok: true, revoked })
}
