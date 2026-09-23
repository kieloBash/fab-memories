// test-harness/integration/_support/setup.ts
//
// Runs before EVERY integration test file (before the file's own imports are evaluated).
//   1. Points the app's Prisma client at TEST_DATABASE_URL (or TEST_RUNTIME_DATABASE_URL, to test through the
//      restricted app_runtime role).
//   2. Replaces the four things that would leave the machine: Clerk (auth + backend client), Supabase Storage,
//      SMTP e-mail and next/headers. Everything else — route handlers, queries, transactions, the audit hash
//      chain, notifications — is the real code.
import "dotenv/config"
import { vi } from "vitest"

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
if (process.env.TEST_RUNTIME_DATABASE_URL) process.env.RUNTIME_DATABASE_URL = process.env.TEST_RUNTIME_DATABASE_URL
else delete process.env.RUNTIME_DATABASE_URL
process.env.CRON_SECRET = "itest-cron-secret"
// A made-up, TEST-ONLY signing secret: the webhook test signs its fake Clerk events with it. Not a real key.
process.env.CLERK_WEBHOOK_SIGNING_SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"
delete process.env.SMTP_HOST // e-mail goes to the recording mock below either way

vi.mock("@/lib/clerk/auth", () => import("./mocks/clerk-auth"))
vi.mock("@/lib/clerk/client", () => import("./mocks/clerk-client"))
vi.mock("@/lib/storage", () => import("./mocks/storage"))
vi.mock("@/lib/email/send", () => import("./mocks/email"))
vi.mock("next/headers", () => import("./mocks/next-headers"))

// Remove this file's test data when it finishes. Dynamic import: the Prisma client must be created AFTER the
// DATABASE_URL override above (static imports would be hoisted above it).
import { afterAll } from "vitest"
afterAll(async () => {
  const { cleanupTestData, disconnectOwner } = await import("./cleanup")
  await cleanupTestData()
  await disconnectOwner()
})
