// test-harness/integration/_support/global-setup.ts
//
// Runs ONCE before the integration project. Refuses to run unless:
//   • TEST_DATABASE_URL is set explicitly (the integration suite never falls back to DATABASE_URL), and
//   • the URL does not look like production (override with ALLOW_PROD_LIKE_TEST_DB=1 — don't), and
//   • the base seed is present (the suites look up the seeded accounts by username).
import "dotenv/config"
import pg from "pg"

export const SEED_USERNAMES = ["admin", "coordinator", "coordinator2", "vendor", "client_anna", "client_ben"]

export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL
  if (!url) {
    throw new Error(
      "\n\n  TEST_DATABASE_URL is not set.\n" +
      "  The integration suite writes to a real database, so it only runs against one you name explicitly.\n" +
      "  Point it at a DEV/TEST database (owner role) that has the base seed, e.g. in .env:\n" +
      "    TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/fab_test\n\n",
    )
  }
  if (/prod|production|live/i.test(url) && !process.env.ALLOW_PROD_LIKE_TEST_DB) {
    throw new Error("TEST_DATABASE_URL looks like a production database. Refusing to run.")
  }

  const u = new URL(url)
  const client = new pg.Client({ connectionString: url })
  try {
    await client.connect()
  } catch (err) {
    throw new Error(`Cannot connect to TEST_DATABASE_URL (${u.hostname}): ${(err as Error).message}`)
  }
  try {
    const { rows } = await client.query<{ username: string }>(
      `SELECT username FROM "User" WHERE username = ANY($1)`, [SEED_USERNAMES],
    )
    const missing = SEED_USERNAMES.filter((n) => !rows.some((r) => r.username === n))
    if (missing.length) {
      throw new Error(
        `The base seed is missing (${missing.join(", ")}). Run:  npx tsx prisma/seed.ts   (against TEST_DATABASE_URL)`,
      )
    }
  } finally {
    await client.end()
  }
  console.log(`\n[integration] database ${u.hostname}${u.pathname} as "${decodeURIComponent(u.username)}"\n`)
}
