// lib/security/active-check.test.ts
import { describe, expect, it } from "vitest"
import { isAccountBlocked, isActiveCheckEnforced } from "@/lib/security/active-check"

const env = (vars: Record<string, string | undefined>) => ({ NODE_ENV: "development", ...vars }) as NodeJS.ProcessEnv

describe("isActiveCheckEnforced", () => {
  it("is enforced by default (variable unset)", () => {
    expect(isActiveCheckEnforced(env({}))).toBe(true)
  })
  it("is bypassed when ENFORCE_ACCOUNT_ACTIVE=false in development", () => {
    expect(isActiveCheckEnforced(env({ ENFORCE_ACCOUNT_ACTIVE: "false" }))).toBe(false)
    expect(isActiveCheckEnforced(env({ ENFORCE_ACCOUNT_ACTIVE: " OFF " }))).toBe(false)
  })
  it("stays enforced for any other value", () => {
    expect(isActiveCheckEnforced(env({ ENFORCE_ACCOUNT_ACTIVE: "true" }))).toBe(true)
    expect(isActiveCheckEnforced(env({ ENFORCE_ACCOUNT_ACTIVE: "maybe" }))).toBe(true)
  })
  it("can never be bypassed in production", () => {
    expect(isActiveCheckEnforced({ NODE_ENV: "production", ENFORCE_ACCOUNT_ACTIVE: "false" } as NodeJS.ProcessEnv)).toBe(true)
  })
})

describe("isAccountBlocked", () => {
  it("never blocks an active account", () => {
    expect(isAccountBlocked({ isActive: true }, env({}))).toBe(false)
    expect(isAccountBlocked({ isActive: true }, env({ ENFORCE_ACCOUNT_ACTIVE: "false" }))).toBe(false)
  })
  it("blocks a deactivated account when enforced", () => {
    expect(isAccountBlocked({ isActive: false }, env({}))).toBe(true)
  })
  it("lets a deactivated account through only when bypassed", () => {
    expect(isAccountBlocked({ isActive: false }, env({ ENFORCE_ACCOUNT_ACTIVE: "false" }))).toBe(false)
  })
})
