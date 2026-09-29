// e2e/support/env.ts
//
// Reads the test configuration once. Fails early and clearly when something is missing.

export type Role = "admin" | "coordinator" | "coordinator2" | "client" | "client2"

function req(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name} — copy e2e/.env.e2e.example to e2e/.env.e2e and fill it in.`)
  return v
}

export const TAG = process.env.E2E_TAG || "E2E-"

export const CREDENTIALS: Record<Role, { identifier: string; password: string; portal: "staff" | "client" }> = {
  get admin() { return { identifier: req("E2E_ADMIN_USERNAME"), password: req("E2E_ADMIN_PASSWORD"), portal: "staff" as const } },
  get coordinator() { return { identifier: req("E2E_COORDINATOR_USERNAME"), password: req("E2E_COORDINATOR_PASSWORD"), portal: "staff" as const } },
  get coordinator2() { return { identifier: req("E2E_COORDINATOR2_USERNAME"), password: req("E2E_COORDINATOR2_PASSWORD"), portal: "staff" as const } },
  get client() { return { identifier: req("E2E_CLIENT_EMAIL"), password: req("E2E_CLIENT_PASSWORD"), portal: "client" as const } },
  get client2() { return { identifier: req("E2E_CLIENT2_EMAIL"), password: req("E2E_CLIENT2_PASSWORD"), portal: "client" as const } },
}

/** Where each role lands after signing in (lib/clerk/portal.ts → dashboardFor). */
export const HOME: Record<Role, string> = {
  admin: "/staff/admin",
  coordinator: "/staff/coordinator",
  coordinator2: "/staff/coordinator",
  client: "/portal",
  client2: "/portal",
}

export const LOGIN_PAGE = { staff: "/staff-login", client: "/sign-in" } as const

export const storageStatePath = (role: Role) => `e2e/.auth/${role}.json`

export const OPTIONAL = {
  signup: process.env.E2E_ALLOW_SIGNUP === "true",
  cronSecret: process.env.E2E_CRON_SECRET || "",
}
