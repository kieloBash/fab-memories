// test-harness/unit/session-expired-route.unit.test.ts
//
// POST /api/auth/session-expired — ends a session older than SESSION_MAX_AGE (revoke + audit), and nothing else.
import { beforeEach, describe, expect, it, vi } from "vitest"

const h = vi.hoisted(() => ({
  auth: { userId: "user_1" as string | null, sessionId: "sess_1" as string | null, factorVerificationAge: [2000, -1] as [number, number] | null },
  sessionStatus: "active",
  revoke: vi.fn(async () => true),
  log: vi.fn(async (_entry: any) => {}),
}))

vi.mock("@clerk/nextjs/server", () => ({ auth: async () => h.auth }))
vi.mock("@/lib/clerk/client", () => ({ clerkClient: async () => ({ sessions: { getSession: async () => ({ status: h.sessionStatus }) } }) }))
vi.mock("@/lib/clerk/auth", () => ({
  revokeCurrentSession: h.revoke,
  getCurrentDbUser: async () => ({ id: "db_1", role: "COORDINATOR" }),
}))
vi.mock("@/lib/audit/log", () => ({ logAction: h.log }))

import { POST } from "@/app/api/auth/session-expired/route"

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.SESSION_MAX_AGE
  h.auth = { userId: "user_1", sessionId: "sess_1", factorVerificationAge: [2000, -1] }
  h.sessionStatus = "active"
})

describe("POST /api/auth/session-expired", () => {
  it("expired → revokes the session and writes ONE LOGOUT audit entry", async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, revoked: true })
    expect(h.revoke).toHaveBeenCalledTimes(1)
    expect(h.log).toHaveBeenCalledTimes(1)
    expect(h.log.mock.calls[0][0]).toMatchObject({
      userId: "db_1", action: "LOGOUT", module: "AUTH", status: "SUCCESS",
      metadata: { event: "SESSION_EXPIRED", maxAgeMinutes: 1440, sessionAgeMinutes: 2000, sessionRevoked: true },
    })
    expect(h.log.mock.calls[0][0].description).toContain("1d maximum session age")
  })

  it("still within the limit → 409 NOT_EXPIRED, nothing revoked or logged (a crafted link cannot log anyone out)", async () => {
    h.auth.factorVerificationAge = [10, -1]
    const res = await POST()
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: "NOT_EXPIRED" })
    expect(h.revoke).not.toHaveBeenCalled()
    expect(h.log).not.toHaveBeenCalled()
  })

  it("respects SESSION_MAX_AGE", async () => {
    process.env.SESSION_MAX_AGE = "15m"
    h.auth.factorVerificationAge = [20, -1]
    expect((await POST()).status).toBe(200)
  })

  it("age unknown → 409 AGE_UNKNOWN, nothing happens", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    h.auth.factorVerificationAge = null
    expect((await POST()).status).toBe(409)
    expect(h.revoke).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it("already ended at Clerk (another tab got there first) → no second revoke or audit entry", async () => {
    h.sessionStatus = "revoked"
    const res = await POST()
    expect(await res.json()).toMatchObject({ ok: true, alreadyEnded: true })
    expect(h.revoke).not.toHaveBeenCalled()
    expect(h.log).not.toHaveBeenCalled()
  })

  it("no session → 401 NO_SESSION", async () => {
    h.auth = { userId: null, sessionId: null, factorVerificationAge: null }
    expect((await POST()).status).toBe(401)
  })
})
