// lib/security/session-policy.ts
//
// How long a sign-in stays valid in THIS app — configurable, default 1 day.
//
//   SESSION_MAX_AGE=1d      (default)   also accepts e.g. 90m, 12h, 7d
//
// How it is enforced: Clerk puts the "factor verification age" into every session token — the minutes since the user
// last entered their password (first factor). proxy.ts compares it with SESSION_MAX_AGE on every request; no database
// or network call is needed. An expired session is sent to its login page with ?error=SESSION_EXPIRED, where the page
// ends it (POST /api/auth/session-expired: revoke at Clerk + audit entry) and signs the browser out.
//
// LIMITS (state these in the thesis):
//   • This can only make sessions SHORTER than Clerk's own limit. Clerk Dashboard → Sessions → "Maximum lifetime" must
//     be at least SESSION_MAX_AGE, otherwise Clerk ends the session first.
//   • The clock restarts whenever the user re-enters their password (Clerk re-verification).
//   • If the session token has no verification age (an older Clerk session-token version), the check is skipped and a
//     warning is logged once — the app then falls back to Clerk's own lifetime.
//
// Pure functions only — safe to import from proxy.ts, route handlers and tests.

export const DEFAULT_SESSION_MAX_AGE = "1d"

const UNIT_MINUTES = { m: 1, h: 60, d: 60 * 24 } as const

/** "90m" | "12h" | "1d" → minutes. Returns null for anything else (including 0 and negative values). */
export function parseDurationToMinutes(input: string | null | undefined): number | null {
  if (!input) return null
  const match = /^\s*(\d+)\s*([mhd])\s*$/i.exec(input)
  if (!match) return null
  const amount = Number(match[1])
  if (!Number.isSafeInteger(amount) || amount <= 0) return null
  return amount * UNIT_MINUTES[match[2].toLowerCase() as keyof typeof UNIT_MINUTES]
}

let warnedInvalid = false

/** The configured maximum session age in minutes. An invalid value falls back to the 1-day default (never "unlimited"). */
export function getSessionMaxAgeMinutes(raw: string | undefined = process.env.SESSION_MAX_AGE): number {
  const parsed = parseDurationToMinutes(raw)
  if (parsed !== null) return parsed
  if (raw && !warnedInvalid) {
    warnedInvalid = true
    console.warn(`[session-policy] SESSION_MAX_AGE="${raw}" is not valid (use e.g. 90m, 12h, 1d) — using ${DEFAULT_SESSION_MAX_AGE}.`)
  }
  return parseDurationToMinutes(DEFAULT_SESSION_MAX_AGE)!
}

/** 1440 → "1d", 90 → "90m" — for messages and audit descriptions. */
export function formatMinutes(minutes: number): string {
  if (minutes % UNIT_MINUTES.d === 0) return `${minutes / UNIT_MINUTES.d}d`
  if (minutes % UNIT_MINUTES.h === 0) return `${minutes / UNIT_MINUTES.h}h`
  return `${minutes}m`
}

/** Clerk's factorVerificationAge: [minutes since first factor, minutes since second factor]; -1 = never. */
export type FactorVerificationAge = readonly [number, number] | null | undefined

/** Minutes since the password was entered, or null when the token does not say. */
export function sessionAgeMinutes(fva: FactorVerificationAge): number | null {
  const first = Array.isArray(fva) ? fva[0] : undefined
  return typeof first === "number" && Number.isFinite(first) && first >= 0 ? first : null
}

let warnedMissingAge = false

/**
 * true  → older than the limit (expired)
 * false → still within the limit
 * null  → unknown (no verification age in the token) — the caller must NOT treat this as expired.
 */
export function isSessionExpired(fva: FactorVerificationAge, maxAgeMinutes: number = getSessionMaxAgeMinutes()): boolean | null {
  const age = sessionAgeMinutes(fva)
  if (age === null) {
    if (!warnedMissingAge) {
      warnedMissingAge = true
      console.warn("[session-policy] The session token has no factor verification age — SESSION_MAX_AGE is not enforced; Clerk's own session lifetime applies.")
    }
    return null
  }
  return age >= maxAgeMinutes
}
