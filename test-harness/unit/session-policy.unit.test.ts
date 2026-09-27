// test-harness/unit/session-policy.unit.test.ts
//
// lib/security/session-policy.ts (SESSION_MAX_AGE) and the browser-side redirect in lib/axios.ts.
import { AxiosError } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  formatMinutes, getSessionMaxAgeMinutes, isSessionExpired, parseDurationToMinutes, sessionAgeMinutes,
} from "@/lib/security/session-policy"
import { __resetSessionExpiredGuard, redirectIfSessionExpired } from "@/lib/axios"

describe("parseDurationToMinutes", () => {
  it.each([
    ["1d", 1440], ["7d", 10080], ["12h", 720], ["90m", 90], [" 2H ", 120], ["1D", 1440],
  ])("%s → %i minutes", (input, minutes) => expect(parseDurationToMinutes(input)).toBe(minutes))

  it.each(["", "0d", "-1d", "1w", "1.5h", "abc", "10", "1 day"])("%j → null", (input) => {
    expect(parseDurationToMinutes(input)).toBeNull()
  })
})

describe("getSessionMaxAgeMinutes", () => {
  it("defaults to 1 day", () => expect(getSessionMaxAgeMinutes(undefined)).toBe(1440))
  it("uses a valid value", () => expect(getSessionMaxAgeMinutes("8h")).toBe(480))
  it("an invalid value falls back to 1 day — never unlimited", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(getSessionMaxAgeMinutes("forever")).toBe(1440)
    warn.mockRestore()
  })
})

describe("formatMinutes", () => {
  it.each([[1440, "1d"], [2880, "2d"], [720, "12h"], [90, "90m"]])("%i → %s", (m, s) => expect(formatMinutes(m)).toBe(s))
})

describe("isSessionExpired (fva = [minutes since password, minutes since 2nd factor])", () => {
  it("younger than the limit → false", () => expect(isSessionExpired([1439, -1], 1440)).toBe(false))
  it("exactly the limit → true", () => expect(isSessionExpired([1440, -1], 1440)).toBe(true))
  it("older → true", () => expect(isSessionExpired([5000, 10], 1440)).toBe(true))
  it("no claim → null (unknown, never 'expired')", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(isSessionExpired(null, 1440)).toBeNull()
    expect(isSessionExpired(undefined, 1440)).toBeNull()
    expect(isSessionExpired([-1, -1], 1440)).toBeNull()
    warn.mockRestore()
  })
  it("sessionAgeMinutes reads the first factor", () => expect(sessionAgeMinutes([42, 3])).toBe(42))
})

describe("redirectIfSessionExpired (axios interceptor)", () => {
  const expiredError = () =>
    new AxiosError("Unauthorized", "401", undefined, undefined, { status: 401, data: { code: "SESSION_EXPIRED" } } as any)
  const loc = (pathname: string) => ({ pathname, assign: vi.fn() })

  beforeEach(() => __resetSessionExpiredGuard())

  it("on a staff screen → /staff-login?error=SESSION_EXPIRED", () => {
    const l = loc("/staff/admin/bookings")
    expect(redirectIfSessionExpired(expiredError(), l)).toBe(true)
    expect(l.assign).toHaveBeenCalledWith("/staff-login?error=SESSION_EXPIRED")
  })

  it("on a client screen → /sign-in?error=SESSION_EXPIRED", () => {
    const l = loc("/portal/payments")
    redirectIfSessionExpired(expiredError(), l)
    expect(l.assign).toHaveBeenCalledWith("/sign-in?error=SESSION_EXPIRED")
  })

  it("redirects only once, even if many queries fail together", () => {
    const l = loc("/portal")
    redirectIfSessionExpired(expiredError(), l)
    redirectIfSessionExpired(expiredError(), l)
    expect(l.assign).toHaveBeenCalledTimes(1)
  })

  it("ignores other errors (plain 401, 403, network)", () => {
    const l = loc("/portal")
    const plain401 = new AxiosError("x", "401", undefined, undefined, { status: 401, data: { code: "NO_SESSION" } } as any)
    const forbidden = new AxiosError("x", "403", undefined, undefined, { status: 403, data: { code: "SESSION_EXPIRED" } } as any)
    expect(redirectIfSessionExpired(plain401, l)).toBe(false)
    expect(redirectIfSessionExpired(forbidden, l)).toBe(false)
    expect(redirectIfSessionExpired(new Error("boom"), l)).toBe(false)
    expect(l.assign).not.toHaveBeenCalled()
  })

  it("does nothing on a login page (the page handles it)", () => {
    const l = loc("/staff-login")
    expect(redirectIfSessionExpired(expiredError(), l)).toBe(false)
  })
})
