// test-harness/unit/page-session.unit.test.ts
//
// lib/clerk/page-session.ts — how the /staff and /portal layouts decide who is viewing a page.
// The bug it fixes: a session token with no role made /staff → /portal → /staff loop forever.
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  clerkId: null as string | null,
  tokenRole: null as string | null,
  dbUser: null as { role: string; isActive: boolean; fullName: string } | null,
}))

vi.mock("@/lib/clerk/auth", () => ({
  getCurrentClerkId: async () => h.clerkId,
  getCurrentRole: async () => h.tokenRole,
  getCurrentDbUser: async () => h.dbUser,
}))

import { getPageSession } from "@/lib/clerk/page-session";

beforeEach(() => { h.clerkId = null; h.tokenRole = null; h.dbUser = null })

describe("getPageSession", () => {
  it("signed out → signedIn false (the layout sends to the login page)", async () => {
    expect(await getPageSession()).toMatchObject({ signedIn: false, role: null })
  })

  it("role in the session token wins", async () => {
    h.clerkId = "user_1"; h.tokenRole = "COORDINATOR"; h.dbUser = { role: "COORDINATOR", isActive: true, fullName: "C" }
    expect(await getPageSession()).toMatchObject({ signedIn: true, role: "COORDINATOR", roleSource: "token" })
  })

  it("no role in the token → falls back to the database role (no redirect loop)", async () => {
    h.clerkId = "user_1"; h.dbUser = { role: "ADMIN", isActive: true, fullName: "A" }
    expect(await getPageSession()).toMatchObject({ signedIn: true, role: "ADMIN", roleSource: "database" })
  })

  it("no role in the token and the account is deactivated → role null (layout shows /unauthorized)", async () => {
    h.clerkId = "user_1"; h.dbUser = { role: "ADMIN", isActive: false, fullName: "A" }
    expect(await getPageSession()).toMatchObject({ signedIn: true })
  })

  it("no role anywhere → role null, never guessed", async () => {
    h.clerkId = "user_1"
    expect(await getPageSession()).toMatchObject({ signedIn: true, role: null, roleSource: null })
  })
})
