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

// ── Sign-in refusal codes ────────────────────────────────────────────────────
//
// When a login page refuses a sign-in it signs the browser out and returns to itself with `?error=<code>`
// (Clerk's signOut() navigates, which would otherwise wipe the on-screen message). Only these codes are ever
// shown — anything else in the URL falls back to a generic message, so nothing can be injected through the link.

export type SignInErrorCode =
  | "WRONG_PORTAL"
  | "ACCOUNT_DEACTIVATED"
  | "ACCOUNT_NOT_FOUND"
  | "NO_SESSION"
  | "CHECK_FAILED"
  | "RESET_PASSWORD_REQUIRED"
  | "SESSION_TASK"

export const SIGN_IN_ERROR_CODES: readonly SignInErrorCode[] = [
  "WRONG_PORTAL", "ACCOUNT_DEACTIVATED", "ACCOUNT_NOT_FOUND", "NO_SESSION", "CHECK_FAILED", "RESET_PASSWORD_REQUIRED", "SESSION_TASK",
]

/** The message a login page shows for a refusal code. `page` = the portal of the login page showing it. */
export function signInErrorMessage(code: string | null | undefined, page: Portal): string {
  switch (code) {
    case "WRONG_PORTAL":
      return wrongPortalMessage(page === "client" ? "staff" : "client")
    case "ACCOUNT_DEACTIVATED":
      return "This account has been deactivated. Please contact an administrator."
    case "ACCOUNT_NOT_FOUND":
      return "Your sign-in worked, but we couldn't find your account details. Please contact support so we can link your account."
    case "NO_SESSION":
      return "Your sign-in didn't finish. Please try again."
    case "RESET_PASSWORD_REQUIRED":
      return "For your security you need to set a new password first. Use \"Forgot password?\" below to choose one."
    case "SESSION_TASK":
      return "Your account needs one more step before you can sign in. Please contact support."
    default:
      return "We couldn't verify your account just now. Please try signing in again."
  }
}

/** Where to send the browser after refusing a sign-in on `page`, carrying the refusal code. */
export function signInErrorUrl(page: Portal, code: string): string {
  const safe = (SIGN_IN_ERROR_CODES as readonly string[]).includes(code) ? code : "CHECK_FAILED"
  return `${LOGIN_PATH[page]}?error=${safe}`
}
