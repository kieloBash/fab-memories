// lib/clerk/page-session.ts
//
// Who is viewing this PAGE? Used by the /staff and /portal layouts (server components) to decide where a visitor goes.
//
// Why not just getCurrentRole()? That reads the role from the Clerk session token (`metadata.role`). The claim can be
// missing — the session token was not customized in the Clerk Dashboard, the user's publicMetadata has no role yet,
// or the token has not refreshed since the role was set. The layouts used to treat "no role" as "not staff" and
// "not client" at the same time, so /staff sent the user to /portal and /portal sent them back to /staff: an
// endless redirect loop. Now:
//
//   1. no Clerk session                     → signedIn: false   (layout sends to the right LOGIN page)
//   2. role in the session token             → that role
//   3. no role in the token, active DB row   → the role from our database (authoritative, same as portal-check)
//                                              ("active" per lib/security/active-check.ts — bypassable in development)
//   4. still no role                         → role: null        (layout sends to /unauthorized — never loops)
//
// Kept in its own file (not lib/clerk/auth.ts) so the test doubles of lib/clerk/auth.ts need no new export.

import type { Role } from "@/app/generated/prisma/client"
import { getCurrentClerkId, getCurrentDbUser, getCurrentRole } from "@/lib/clerk/auth"
import { isAccountBlocked } from "@/lib/security/active-check"

export type PageDbUser = Awaited<ReturnType<typeof getCurrentDbUser>>

export interface PageSession {
  signedIn: boolean
  role: Role | null
  /** Where the role came from — handy when debugging a Clerk session-token setup. */
  roleSource: "token" | "database" | null
  dbUser: PageDbUser
}

export async function getPageSession(): Promise<PageSession> {
  const clerkId = await getCurrentClerkId()
  if (!clerkId) return { signedIn: false, role: null, roleSource: null, dbUser: null }

  const [tokenRole, dbUser] = await Promise.all([getCurrentRole(), getCurrentDbUser()])

  if (tokenRole) return { signedIn: true, role: tokenRole, roleSource: "token", dbUser }
  if (dbUser && !isAccountBlocked(dbUser)) return { signedIn: true, role: dbUser.role, roleSource: "database", dbUser }
  return { signedIn: true, role: null, roleSource: null, dbUser }
}
