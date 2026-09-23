// vitest.config.ts
//
// Three test projects (run one with --project <name>):
//   ui           jsdom + Testing Library. Real components, network mocked (existing suite + new happy paths).
//   unit         node. Pure logic: schemas, transitions, audit chain, redaction, CSV, dates, RBAC,
//                plus two "contract" checks (client API calls ↔ route handlers, internal links ↔ pages).
//   integration  node + a REAL PostgreSQL database. Calls the real route handlers; only Clerk, Supabase Storage,
//                e-mail and next/headers are mocked. Requires TEST_DATABASE_URL (see test-harness/README.md).
//
//   npm test            → ui + unit (no database needed)
//   npm run test:int    → integration only
//   npm run test:all    → everything
import "dotenv/config"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig, type TestProjectInlineConfiguration } from "vitest/config"

// Without a test database the integration project is left out (so a plain `npx vitest run` still runs UI + unit),
// unless it is asked for explicitly (`--project integration`, or a path under integration/), in which case its
// global setup explains what is missing.
const integrationRequested = process.argv.slice(2).some((a) => a.includes("integration"))
const includeIntegration = !!process.env.TEST_DATABASE_URL || integrationRequested
if (!includeIntegration && !(globalThis as any).__fabIntegrationNotice) {
  ;(globalThis as any).__fabIntegrationNotice = true // the config is evaluated once per project; say it once
  console.log("[vitest] integration tests skipped — set TEST_DATABASE_URL to include them (see test-harness/README.md)")
}

const integrationProject: TestProjectInlineConfiguration = {
  extends: true,
  test: {
    name: "integration",
    environment: "node",
    globals: true,
    include: ["test-harness/integration/**/*.int.test.ts"],
    globalSetup: ["./test-harness/integration/_support/global-setup.ts"],
    setupFiles: ["./test-harness/integration/_support/setup.ts"],
    // One database, one audit hash-chain: singleFork runs the files one after another in a single process.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: { jsx: "automatic" },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          globals: true,
          css: false,
          setupFiles: ["./test-harness/ui/setup.ts"],
          include: ["test-harness/ui/**/*.test.tsx"],
          testTimeout: 15_000,
        },
      },
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          globals: true,
          include: ["test-harness/unit/**/*.unit.test.ts"],
        },
      },
      ...(includeIntegration ? [integrationProject] : []),
    ],
  },
})
