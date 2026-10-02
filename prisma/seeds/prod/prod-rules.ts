// prisma/seeds/prod/prod-rules.ts
//
// Pure rules for the PRODUCTION setup seed (prisma/seeds/prod-setup.ts) — no database or Clerk imports, so they are
// unit-tested on their own (test-harness/unit/prod-setup.unit.test.ts).
//
//   readProdAccounts()   the 3 staff accounts, read from PROD_* environment variables — never from code
//   staffPlaceholderEmail()  the never-verified Clerk email a staff account gets (same idea as /api/staff-accounts)
//   describeTarget()     which database and which Clerk instance the script is about to touch

export type ProdRole = "ADMIN" | "COORDINATOR"

export interface ProdAccount {
  /** Env prefix this account was read from, e.g. "PROD_ADMIN" — used in messages only. */
  key: string
  role: ProdRole
  username: string
  fullName: string
  /** Real inbox. Stored in the database (staff alerts go here), NOT used as a Clerk sign-in identifier. */
  email: string
  password: string
}

/** The published demo password. A production account may never use it. */
export const DEMO_PASSWORD = "FabMemories123!"
export const MIN_PASSWORD_LENGTH = 12

const ACCOUNT_SPECS: { key: string; role: ProdRole }[] = [
  { key: "PROD_ADMIN", role: "ADMIN" },
  { key: "PROD_COORD1", role: "COORDINATOR" },
  { key: "PROD_COORD2", role: "COORDINATOR" },
]

/** Clerk usernames: 4–64 characters, letters, numbers, "-" and "_". */
const USERNAME_RE = /^[A-Za-z0-9_-]{4,64}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function passwordProblem(pw: string): string | null {
  if (pw === DEMO_PASSWORD) return "is the published demo password"
  if (pw.length < MIN_PASSWORD_LENGTH) return `is shorter than ${MIN_PASSWORD_LENGTH} characters`
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "needs at least one letter and one number"
  return null
}

/**
 * Reads the three accounts from the environment. Every value is REQUIRED — there are no fallbacks, so a missing
 * variable can never silently create an account with a default name or password.
 */
export function readProdAccounts(env: Record<string, string | undefined> = process.env): {
  accounts: ProdAccount[]
  errors: string[]
} {
  const accounts: ProdAccount[] = []
  const errors: string[] = []

  for (const { key, role } of ACCOUNT_SPECS) {
    const get = (field: string) => (env[`${key}_${field}`] ?? "").trim()
    const username = get("USERNAME")
    const fullName = get("FULLNAME")
    const email = get("EMAIL").toLowerCase()
    const password = env[`${key}_PASSWORD`] ?? "" // not trimmed: spaces may be intentional

    const missing = ["USERNAME", "FULLNAME", "EMAIL", "PASSWORD"].filter((f) => !(f === "PASSWORD" ? password : get(f)))
    if (missing.length) {
      errors.push(`${key}: missing ${missing.map((f) => `${key}_${f}`).join(", ")}`)
      continue
    }
    if (!USERNAME_RE.test(username)) errors.push(`${key}_USERNAME must be 4–64 letters, numbers, "-" or "_"`)
    if (fullName.length > 100) errors.push(`${key}_FULLNAME is longer than 100 characters`)
    if (!EMAIL_RE.test(email)) errors.push(`${key}_EMAIL is not a valid email address`)
    if (email.endsWith("@example.com")) errors.push(`${key}_EMAIL must be a real inbox (staff alerts are sent there), not @example.com`)
    const pw = passwordProblem(password)
    if (pw) errors.push(`${key}_PASSWORD ${pw}`)

    accounts.push({ key, role, username, fullName, email, password })
  }

  const dup = (values: string[]) => values.filter((v, i) => values.indexOf(v) !== i)
  for (const u of new Set(dup(accounts.map((a) => a.username.toLowerCase())))) errors.push(`Username "${u}" is used by more than one account`)
  for (const e of new Set(dup(accounts.map((a) => a.email)))) errors.push(`Email "${e}" is used by more than one account`)
  for (const p of new Set(dup(accounts.map((a) => a.password)))) if (p) errors.push("Two or more accounts share the same password — give each person their own")

  return { accounts, errors }
}

/** Staff sign in by USERNAME. Clerk still requires an email, so it gets a reserved, never-deliverable address. */
export function staffPlaceholderEmail(username: string, now = Date.now()): string {
  return `staff.${username.toLowerCase()}.${now}@example.com`
}

export interface TargetInfo {
  databaseHost: string
  databaseName: string
  clerkMode: "LIVE" | "development" | "offline stub" | "missing"
}

export function describeTarget(env: Record<string, string | undefined> = process.env): TargetInfo {
  let databaseHost = "(not set)", databaseName = ""
  try {
    const u = new URL(env.DATABASE_URL ?? "")
    databaseHost = u.host
    databaseName = u.pathname.replace(/^\//, "")
  } catch { /* keep defaults */ }
  const key = env.CLERK_SECRET_KEY ?? ""
  const clerkMode: TargetInfo["clerkMode"] = env.SEED_CLERK_STUB ? "offline stub"
    : key.startsWith("sk_live_") ? "LIVE"
    : key.startsWith("sk_test_") ? "development"
    : "missing"
  return { databaseHost, databaseName, clerkMode }
}

/** Migration folders that exist on disk but are not applied (finished, not rolled back) in the database. */
export function pendingMigrations(onDisk: string[], applied: string[]): string[] {
  const done = new Set(applied)
  return onDisk.filter((m) => !done.has(m)).sort()
}
