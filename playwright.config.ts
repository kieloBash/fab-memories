// playwright.config.ts
//
// Browser (end-to-end) tests against a RUNNING deployment — by default the live site.
// Every test title starts with its test-case ID (e.g. "TC-FR10-01") so results map 1:1 to
// FabMemories_Functional_Test_Cases.xlsx. See e2e/README.md.
//
//   npm run e2e            → all tests, desktop Chrome + mobile smoke
//   npm run e2e:report     → open the HTML report (screenshots of every test = evidence)
//   npm run e2e:results    → write e2e/results/results.csv for the workbook
import { defineConfig, devices } from "@playwright/test"
import dotenv from "dotenv"

dotenv.config({ path: "e2e/.env.e2e" })
dotenv.config() // falls back to .env for CLERK_* keys

export default defineConfig({
  testDir: "./e2e/specs",
  globalSetup: "./e2e/global-setup.ts",
  // One shared live database: run files one after another so tests never race each other.
  fullyParallel: false,
  workers: 1,
  // No automatic retries — a flaky pass would hide a real result.
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "e2e/report", open: "never" }],
    ["json", { outputFile: "e2e/results/results.json" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://fab-memories.vercel.app",
    screenshot: "on", // every test leaves a screenshot in the report → evidence for Chapter 4
    trace: "retain-on-failure",
    video: "off",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: "setup", testDir: "./e2e", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      // NFR-11 / NFR-22: the page-smoke file again on a phone-sized screen.
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      testMatch: /10-ui-smoke\.spec\.ts/,
      dependencies: ["setup"],
    },
  ],
})
