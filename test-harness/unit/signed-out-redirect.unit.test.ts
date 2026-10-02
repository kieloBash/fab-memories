// test-harness/unit/signed-out-redirect.unit.test.ts
//
// lib/axios.ts — redirectIfSignedOut(). Session lifetime is enforced by CLERK, not by the app. When Clerk ends a session
// (maximum lifetime, inactivity timeout, revoked in the dashboard), proxy.ts answers the next API call with
// 401 { code: "NO_SESSION" }, and this sends the browser to its login page ONCE with ?error=SESSION_ENDED.
// (Replaces session-policy.unit.test.ts, which tested the removed SESSION_MAX_AGE check.)
import { AxiosError } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { __resetSignedOutGuard, redirectIfSignedOut } from "@/lib/axios"

const loc = (pathname: string) => ({ pathname, assign: vi.fn() })
const err = (status: number, code?: string) =>
  new AxiosError("x", String(status), undefined, undefined, { status, data: code ? { code } : {} } as never)
const ended = () => err(401, "NO_SESSION")

beforeEach(() => __resetSignedOutGuard())

describe("redirectIfSignedOut — Clerk ended the session", () => {
  it("on a staff screen → /staff-login?error=SESSION_ENDED", () => {
    const l = loc("/staff/admin/bookings")
    expect(redirectIfSignedOut(ended(), l)).toBe(true)
    expect(l.assign).toHaveBeenCalledWith("/staff-login?error=SESSION_ENDED")
  })

  it("on a client screen → /sign-in?error=SESSION_ENDED", () => {
    const l = loc("/portal/payments")
    redirectIfSignedOut(ended(), l)
    expect(l.assign).toHaveBeenCalledWith("/sign-in?error=SESSION_ENDED")
  })

  it("redirects only once, even if many queries fail together", () => {
    const l = loc("/portal")
    redirectIfSignedOut(ended(), l)
    redirectIfSignedOut(ended(), l)
    redirectIfSignedOut(ended(), l)
    expect(l.assign).toHaveBeenCalledTimes(1)
  })

  it("ignores everything that is not 401 NO_SESSION (other 401s, 403, network errors, non-axios errors)", () => {
    const l = loc("/portal")
    expect(redirectIfSignedOut(err(401), l)).toBe(false)
    expect(redirectIfSignedOut(err(403, "NO_SESSION"), l)).toBe(false)
    expect(redirectIfSignedOut(err(401, "SESSION_EXPIRED"), l)).toBe(false) // the removed custom code means nothing now
    expect(redirectIfSignedOut(new AxiosError("Network Error"), l)).toBe(false)
    expect(redirectIfSignedOut(new Error("boom"), l)).toBe(false)
    expect(l.assign).not.toHaveBeenCalled()
  })

  it.each(["/sign-in", "/staff-login", "/sign-up", "/forgot-password"])(
    "does nothing on %s (the sign-in flow handles NO_SESSION itself)",
    (path) => {
      const l = loc(path)
      expect(redirectIfSignedOut(ended(), l)).toBe(false)
      expect(l.assign).not.toHaveBeenCalled()
    },
  )

  it("does nothing outside a browser (no location)", () => {
    expect(redirectIfSignedOut(ended(), undefined)).toBe(false)
  })
})
