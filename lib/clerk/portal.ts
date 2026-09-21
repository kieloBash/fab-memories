// lib/clerk/portal.ts
//
// Which login page is each role allowed to use? Pure rules, no server imports — used by the API checker, the
// proxy (redirects) and the tests.
//
//   /sign-in      → CLIENT accounts only
//   /staff-login  → ADMIN, COORDINATOR and VENDOR accounts only

import type { Role } from "@/app/generated/prisma/client"

export type Portal = "client" | "staff"

export const LOGIN_PATH: Record<Portal, string> = { client: "/sign-in", staff: "/staff-login" }

/** The only portal this role may sign in through. */
export const portalFor = (role: Role): Portal => (role === "CLIENT" ? "client" : "staff")

/** Where a signed-in user of this role lands. */
export function dashboardFor(role: Role): string {
  switch (role) {
    case "CLIENT": return "/portal"
    case "ADMIN": return "/staff/admin"
    case "COORDINATOR": return "/staff/coordinator"
    default: return "/staff/vendor"
  }
}

/** Shown when the right credentials were used on the wrong login page. `actual` = the portal the account belongs to. */
export function wrongPortalMessage(actual: Portal): string {
  return actual === "staff"
    ? "This is the client sign-in. Staff accounts sign in at the staff login (/staff-login)."
    : "This is the staff sign-in. Client accounts sign in at the regular sign-in (/sign-in)."
}
