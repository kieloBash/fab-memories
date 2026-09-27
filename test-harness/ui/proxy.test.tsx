// test-harness/ui/proxy.test.tsx
//
// proxy.ts — who gets in, and the security headers. Uses the REAL route matchers; only Clerk's session is stubbed.
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>()
  // expose the handler and the options instead of building the real Clerk middleware
  return { ...actual, clerkMiddleware: (handler: any, options: any) => Object.assign(handler, { __options: options }) }
})

const load = async () => (await import("@/proxy")).default as any
type Session = { userId: string | null; role?: string; fva?: [number, number] | null }

async function call(path: string, s: Session = { userId: null }) {
  const proxy = await load()
  const auth = async () => ({ userId: s.userId, sessionClaims: { metadata: { role: s.role } }, factorVerificationAge: s.fva ?? null })
  const res: Response = await proxy(auth, new NextRequest("https://app.test" + path), {} as any)
  const passed = res.headers.get("x-middleware-next") === "1"
  return { res, passed, status: res.status, location: res.headers.get("location") ?? "" }
}

describe("public routes stay reachable without a session", () => {
  it.each([
    "/", "/sign-in", "/sign-up", "/staff-login", "/forgot-password", "/forgot-password?portal=staff", "/packages", "/terms",
    "/api/public/packages", "/api/webhooks/clerk", "/api/vendor-brief/abc123", "/vendor-brief/abc123",
  ])("%s → allowed", async (path) => {
    const r = await call(path)
    expect(r.passed).toBe(true)
    expect(r.status).toBe(200)
  })
})

describe("API is DENY-BY-DEFAULT for signed-out callers", () => {
  it.each([
    "/api/bookings", "/api/bookings/xyz", "/api/bookings/xyz/installments", "/api/payments", "/api/payments/manual",
    "/api/payments/p1/verify", "/api/integrity", "/api/audit", "/api/audit/verify", "/api/reports/dashboard",
    "/api/reports/audit/export", "/api/staff-accounts", "/api/vendors", "/api/packages", "/api/some-route-added-tomorrow",
  ])("%s → 401 JSON, no route code runs", async (path) => {
    const r = await call(path)
    expect(r.status).toBe(401)
    expect(r.passed).toBe(false)
    expect(await r.res.json()).toEqual({ error: "Unauthorized", code: "NO_SESSION" })
  })

  it.each(["ADMIN", "COORDINATOR", "CLIENT", "VENDOR"])("a signed-in %s reaches the route (which then checks the ROLE itself)", async (role) => {
    const r = await call("/api/bookings", { userId: "u1", role })
    expect(r.passed).toBe(true)
  })
})

describe("pages", () => {
  it("signed-out /staff/admin → staff login", async () => expect((await call("/staff/admin")).location).toContain("/staff-login"))
  it("signed-out /portal → client sign-in", async () => expect((await call("/portal")).location).toContain("/sign-in"))
  it("a CLIENT on a staff page → sent to /portal", async () => expect((await call("/staff/admin", { userId: "u", role: "CLIENT" })).location).toContain("/portal"))
  it("staff on the client portal → sent to /staff", async () => expect((await call("/portal", { userId: "u", role: "ADMIN" })).location).toContain("/staff"))
  it("a COORDINATOR on /staff and a CLIENT on /portal get in", async () => {
    expect((await call("/staff/coordinator", { userId: "u", role: "COORDINATOR" })).passed).toBe(true)
    expect((await call("/portal", { userId: "u", role: "CLIENT" })).passed).toBe(true)
  })
})

describe("already signed in → the login pages redirect to the user's own dashboard", () => {
  const dest: [string, string][] = [["CLIENT", "/portal"], ["ADMIN", "/staff/admin"], ["COORDINATOR", "/staff/coordinator"], ["VENDOR", "/staff/vendor"]]
  const pages = ["/sign-in", "/sign-up", "/staff-login", "/sign-in/sso-callback", "/staff-login/factor-two"]

  for (const [role, where] of dest) {
    it.each(pages)(`${role} on %s → ${where}`, async (path) => {
      const r = await call(path, { userId: "u1", role })
      expect(r.status).toBe(307)
      expect(new URL(r.location).pathname).toBe(where)
      expect(new URL(r.location).origin).toBe("https://app.test")       // never off-site
    })
  }

  it.each(pages)("signed-OUT visitors still see %s", async (path) => {
    const r = await call(path)
    expect(r.passed).toBe(true)
    expect(r.status).toBe(200)
  })

  it.each(pages)("signed in but role unknown → NOT redirected on %s (avoids a redirect loop)", async (path) => {
    const r = await call(path, { userId: "u1" })
    expect(r.passed).toBe(true)
  })

  it("/forgot-password is left alone even when signed in", async () => {
    expect((await call("/forgot-password", { userId: "u1", role: "ADMIN" })).passed).toBe(true)
  })

  it("the public site, packages and API are unaffected by the redirect", async () => {
    for (const path of ["/", "/packages", "/terms", "/api/public/packages"]) expect((await call(path, { userId: "u1", role: "CLIENT" })).passed).toBe(true)
  })
})

describe("Content-Security-Policy", () => {
  beforeEach(() => { vi.resetModules(); delete process.env.CSP_ENFORCE })

  it("starts in REPORT-ONLY mode with a strict, nonce-based script policy", async () => {
    const opts = (await load()).__options.contentSecurityPolicy
    expect(opts.strict).toBe(true)
    expect(opts.reportOnly).toBe(true)
  })

  it("CSP_ENFORCE=true switches to enforcing", async () => {
    process.env.CSP_ENFORCE = "true"; vi.resetModules()
    expect((await load()).__options.contentSecurityPolicy.reportOnly).toBe(false)
  })

  it("the header Clerk builds from our options has every protection we need", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcd1234.supabase.co"; vi.resetModules()
    const opts = (await load()).__options.contentSecurityPolicy
    // @ts-ignore — deep import of Clerk's own builder, test only
    const { createContentSecurityPolicyHeaders } = await import("../../node_modules/@clerk/nextjs/dist/esm/server/content-security-policy.js")
    const { headers } = createContentSecurityPolicyHeaders("fit-mouse-12.clerk.accounts.dev", opts) as { headers: [string, string][] }
    const [name, csp] = headers.find(([k]) => /^content-security-policy/i.test(k))!
    const dir = (d: string) => (csp.split(";").map((x) => x.trim()).find((x) => x.startsWith(d + " ")) ?? "")

    expect(name.toLowerCase()).toBe("content-security-policy-report-only")   // header names are case-insensitive
    expect(dir("frame-ancestors")).toBe("frame-ancestors 'none'")
    expect(dir("object-src")).toBe("object-src 'none'")
    expect(dir("base-uri")).toBe("base-uri 'self'")
    expect(dir("form-action")).toBe("form-action 'self'")
    // scripts: nonce + strict-dynamic, and NO blanket https:/http: allowance (Clerk's non-strict default has both)
    expect(dir("script-src")).toMatch(/'nonce-[A-Za-z0-9+/=]+'/)
    expect(dir("script-src")).toContain("'strict-dynamic'")
    expect(dir("script-src")).not.toMatch(/(^|\s)https?:(\s|$)/)
    // payment-proof images + Google Maps + blob previews
    for (const src of ["'self'", "data:", "blob:", "https://*.supabase.co", "https://abcd1234.supabase.co", "https://maps.gstatic.com"]) expect(dir("img-src")).toContain(src)
    // Clerk's frontend API (derived from the publishable key) and Google Maps
    expect(dir("connect-src")).toContain("fit-mouse-12.clerk.accounts.dev")
    expect(dir("connect-src")).toContain("https://maps.googleapis.com")
    expect(dir("font-src")).toContain("https://fonts.gstatic.com")
    // Clerk keeps its bot-protection frame
    expect(dir("frame-src")).toContain("https://challenges.cloudflare.com")
  })

  it("when enforcing, the real (blocking) header name is used", async () => {
    process.env.CSP_ENFORCE = "true"; vi.resetModules()
    const opts = (await load()).__options.contentSecurityPolicy
    // @ts-ignore
    const { createContentSecurityPolicyHeaders } = await import("../../node_modules/@clerk/nextjs/dist/esm/server/content-security-policy.js")
    const { headers } = createContentSecurityPolicyHeaders("x.clerk.accounts.dev", opts) as { headers: [string, string][] }
    const names = headers.map(([k]) => k.toLowerCase())
    expect(names).toContain("content-security-policy")
    expect(names).not.toContain("content-security-policy-report-only")
  })
})

describe("static security headers (next.config.ts)", () => {
  it("are attached to every path", async () => {
    const cfg = (await import("@/next.config")).default
    const rules = await cfg.headers!()
    expect(rules).toHaveLength(1)
    expect(rules[0].source).toBe("/(.*)")
    const h = Object.fromEntries(rules[0].headers.map((x) => [x.key, x.value]))
    expect(h["Strict-Transport-Security"]).toMatch(/max-age=\d{8,}; includeSubDomains/)
    expect(h["Strict-Transport-Security"]).not.toContain("preload")
    expect(h["X-Content-Type-Options"]).toBe("nosniff")
    expect(h["X-Frame-Options"]).toBe("DENY")
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin")
    expect(h["Permissions-Policy"]).toMatch(/camera=\(\).*microphone=\(\).*geolocation=\(\)/)
  })
  it("does not advertise the framework", async () => expect((await import("@/next.config")).default.poweredByHeader).toBe(false))
})

// SESSION_MAX_AGE — default 1d (1440 min). fva = [minutes since password, minutes since 2nd factor].
describe("session max age (SESSION_MAX_AGE, default 1d)", () => {
  const fresh: [number, number] = [30, -1]
  const old: [number, number] = [1440, -1]

  beforeEach(() => { delete process.env.SESSION_MAX_AGE })

  it("a fresh session reaches pages and API routes", async () => {
    expect((await call("/staff/admin", { userId: "u", role: "ADMIN", fva: fresh })).passed).toBe(true)
    expect((await call("/api/bookings", { userId: "u", role: "CLIENT", fva: fresh })).passed).toBe(true)
  })

  it("an expired STAFF session on a page → /staff-login?error=SESSION_EXPIRED", async () => {
    expect((await call("/staff/coordinator", { userId: "u", role: "COORDINATOR", fva: old })).location).toContain("/staff-login?error=SESSION_EXPIRED")
  })

  it("an expired CLIENT session on a page → /sign-in?error=SESSION_EXPIRED", async () => {
    expect((await call("/portal/bookings", { userId: "u", role: "CLIENT", fva: old })).location).toContain("/sign-in?error=SESSION_EXPIRED")
  })

  it("the login page of the account's OWN portal is used, whatever page was requested", async () => {
    expect((await call("/portal", { userId: "u", role: "ADMIN", fva: old })).location).toContain("/staff-login?error=SESSION_EXPIRED")
  })

  it("an expired session calling the API → 401 SESSION_EXPIRED", async () => {
    const r = await call("/api/bookings", { userId: "u", role: "CLIENT", fva: old })
    expect(r.status).toBe(401)
    expect(await r.res.json()).toMatchObject({ code: "SESSION_EXPIRED" })
  })

  it("…except /api/auth/session-expired, which ends the session", async () => {
    expect((await call("/api/auth/session-expired", { userId: "u", role: "CLIENT", fva: old })).passed).toBe(true)
  })

  it("an expired session on a login page is NOT bounced to the dashboard (the page must load to sign it out)", async () => {
    expect((await call("/staff-login?error=SESSION_EXPIRED", { userId: "u", role: "ADMIN", fva: old })).passed).toBe(true)
    expect((await call("/sign-in", { userId: "u", role: "CLIENT", fva: old })).passed).toBe(true)
  })

  it("a fresh session on a login page still goes to its dashboard", async () => {
    expect((await call("/sign-in", { userId: "u", role: "CLIENT", fva: fresh })).location).toContain("/portal")
  })

  it("SESSION_MAX_AGE is read per request (e.g. 15m)", async () => {
    process.env.SESSION_MAX_AGE = "15m"
    expect((await call("/staff/admin", { userId: "u", role: "ADMIN", fva: [20, -1] })).location).toContain("SESSION_EXPIRED")
  })

  it("no verification age in the token → NOT treated as expired (falls back to Clerk's own lifetime)", async () => {
    expect((await call("/staff/admin", { userId: "u", role: "ADMIN", fva: null })).passed).toBe(true)
  })
})
