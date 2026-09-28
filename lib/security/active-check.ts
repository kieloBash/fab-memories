// lib/security/active-check.ts
//
// ONE place that decides whether a deactivated account (User.isActive = false) is blocked.
//
//   ENFORCE_ACCOUNT_ACTIVE=false   → the check is BYPASSED (development/testing only)
//   anything else / unset          → enforced (default)
//
// SAFETY: the flag is IGNORED when NODE_ENV === "production" (next build / next start / any deployment), so the
// check can never be switched off in a deployed system by a stray env var. Note: running `next start` locally is
// also production mode — the bypass only works under `next dev`.
//
// Scope: only the ACCESS checks use this (sign-in, page role resolution, integrity, risks, reports). Business
// filters — "only active coordinators can be assigned", "notify active staff" — still read isActive directly.
//
// Server-only (reads process.env without a NEXT_PUBLIC_ prefix). Pure otherwise — safe to import from route
// handlers, server components and unit tests.

const OFF_VALUES = new Set(["false", "0", "off", "no"])

let warned = false

/** true = deactivated accounts are blocked (the normal, secure behaviour). */
export function isActiveCheckEnforced(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === "production") return true
  const raw = env.ENFORCE_ACCOUNT_ACTIVE?.trim().toLowerCase()
  const bypassed = raw !== undefined && OFF_VALUES.has(raw)
  if (bypassed && !warned) {
    warned = true
    console.warn(
      "[active-check] ENFORCE_ACCOUNT_ACTIVE=false — deactivated accounts are NOT blocked. Development only; remove the variable to restore the check.",
    )
  }
  return !bypassed
}

/**
 * Should this user be refused because the account is deactivated?
 * Callers still handle "no user at all" themselves — this only answers the isActive question.
 */
export function isAccountBlocked(user: { isActive: boolean }, env: NodeJS.ProcessEnv = process.env): boolean {
  return !user.isActive && isActiveCheckEnforced(env)
}

/** Test helper — lets unit tests see the one-time warning again. */
export function __resetActiveCheckWarning() {
  warned = false
}
