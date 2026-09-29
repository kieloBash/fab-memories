// e2e/global-setup.ts
//
// Runs once before everything: gets a Clerk "testing token" (lets the automated browser past
// Clerk's bot protection) and refuses to start without the required settings.
import { clerkSetup } from "@clerk/testing/playwright"
import type { FullConfig } from "@playwright/test"

export default async function globalSetup(_config: FullConfig) {
  for (const k of ["CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]) {
    if (!process.env[k]) throw new Error(`Missing ${k} in e2e/.env.e2e (see e2e/README.md §2).`)
  }
  await clerkSetup()
}
