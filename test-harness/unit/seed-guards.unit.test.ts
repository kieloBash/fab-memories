// test-harness/unit/seed-guards.unit.test.ts
//
// Seed runner safety (prisma/seeds/guards.ts, prisma/seeds/clerk-seed-users.ts):
//   K1  `--fresh` must empty EVERY table — a new model that is not in WIPE_ORDER fails this test
//   K2  a base-seed account is found in Clerk by username and by both emails
//   K3  no demo seeding against a live Clerk key or a production build
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clerkEmailForSeedUser, productionReason, WIPE_ORDER } from "@/prisma/seeds/guards"

const h = vi.hoisted(() => ({
  users: [] as { id: string; username?: string; emails: string[] }[],
  deleted: [] as string[],
}))

vi.mock("@/prisma/seeds/_shared", () => ({
  clerk: {
    users: {
      getUserList: async (p: { emailAddress?: string[]; username?: string[] }) => ({
        data: h.users.filter((u) =>
          (p.emailAddress && u.emails.some((e) => p.emailAddress!.includes(e))) ||
          (p.username && !!u.username && p.username.includes(u.username))),
      }),
      deleteUser: async (id: string) => {
        if (!h.users.some((u) => u.id === id)) { const e: any = new Error("not found"); e.status = 404; throw e }
        h.deleted.push(id); h.users = h.users.filter((u) => u.id !== id)
      },
    },
  },
}))

import { removeSeedUserFromClerk } from "@/prisma/seeds/clerk-seed-users"

const camel = (s: string) => s[0].toLowerCase() + s.slice(1)
const models = [...readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8").matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => camel(m[1]))

describe("K1 — WIPE_ORDER covers the whole schema", () => {
  it("every model in schema.prisma is wiped by --fresh", () => {
    const missing = models.filter((m) => !(WIPE_ORDER as readonly string[]).includes(m))
    expect(missing, `add these to WIPE_ORDER in prisma/seeds/guards.ts: ${missing.join(", ")}`).toEqual([])
  })
  it("lists no model that does not exist", () => {
    expect(WIPE_ORDER.filter((m) => !models.includes(m))).toEqual([])
  })
  it("user is deleted last (everything that references it goes first)", () => {
    expect(WIPE_ORDER[WIPE_ORDER.length - 1]).toBe("user")
  })
  it("includes the two tables that used to block the wipe", () => {
    expect(WIPE_ORDER).toContain("notification")
    expect(WIPE_ORDER).toContain("coordinatorUnavailability")
    expect(WIPE_ORDER.indexOf("booking")).toBeGreaterThan(WIPE_ORDER.indexOf("payment"))
  })
})

describe("K3 — productionReason", () => {
  it("allows a test key in development", () => expect(productionReason({ CLERK_SECRET_KEY: "sk_test_x", NODE_ENV: "development" })).toBeNull())
  it("refuses a live Clerk key", () => expect(productionReason({ CLERK_SECRET_KEY: "sk_live_x" })).toMatch(/LIVE key/))
  it("refuses NODE_ENV=production", () => expect(productionReason({ CLERK_SECRET_KEY: "sk_test_x", NODE_ENV: "production" })).toMatch(/production/))
  it("the offline stub is always allowed", () => expect(productionReason({ SEED_CLERK_STUB: "/tmp/x.json", CLERK_SECRET_KEY: "sk_live_x" })).toBeNull())
})

describe("K2 — Clerk email of a seed account", () => {
  it("staff get the placeholder", () => expect(clerkEmailForSeedUser({ username: "admin", email: "admin.fabmemories@example.com", role: "ADMIN" })).toBe("seed.admin@example.com"))
  it("clients keep their email", () => expect(clerkEmailForSeedUser({ username: "client_anna", email: "anna@example.com", role: "CLIENT" })).toBe("anna@example.com"))
})

describe("K2 — removeSeedUserFromClerk", () => {
  beforeEach(() => { h.users = []; h.deleted = [] })
  const admin = { username: "admin", email: "admin.fabmemories@example.com", role: "ADMIN" }

  it("finds a staff account created as seed.<username>@example.com when the database row is gone", async () => {
    h.users = [{ id: "user_A", username: "admin", emails: ["seed.admin@example.com"] }]
    expect(await removeSeedUserFromClerk(admin)).toBe(1)
    expect(h.deleted).toEqual(["user_A"])
  })

  it("finds an account by username even if its email was changed", async () => {
    h.users = [{ id: "user_B", username: "admin", emails: ["someone-else@example.com"] }]
    await removeSeedUserFromClerk(admin)
    expect(h.deleted).toEqual(["user_B"])
  })

  it("deletes each account once when several lookups find it, plus the stored id", async () => {
    h.users = [
      { id: "user_A", username: "admin", emails: ["seed.admin@example.com"] },
      { id: "user_OLD", username: undefined, emails: ["old@example.com"] },
    ]
    expect(await removeSeedUserFromClerk(admin, "user_OLD")).toBe(2)
    expect(h.deleted.sort()).toEqual(["user_A", "user_OLD"])
  })

  it("leaves unrelated users alone", async () => {
    h.users = [{ id: "user_ME", username: "kielo", emails: ["me@example.com"] }]
    expect(await removeSeedUserFromClerk(admin)).toBe(0)
    expect(h.users).toHaveLength(1)
  })

  it("an already-deleted stored id (404) is not an error", async () => {
    await expect(removeSeedUserFromClerk(admin, "user_GONE")).resolves.toBe(0)
  })
})
