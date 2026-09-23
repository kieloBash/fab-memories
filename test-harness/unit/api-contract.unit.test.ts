// test-harness/unit/api-contract.unit.test.ts
//
// CONTRACT: every request the browser code makes must land on a route handler that exists and exports that method.
//
// The UI tests mock axios, so a client calling a URL the server doesn't serve still passes them — and the bug only
// shows up in a real browser (this is how FINDINGS.md #5, the vendor-coverage 405, went unnoticed).
// This test calls EVERY exported function in features/*/*.api.ts with placeholder arguments, records the
// (method, url) it sends through @/lib/axios, and resolves each against app/api/** the way Next.js does
// (static segments win over [dynamic] ones).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { beforeAll, describe, expect, it, vi } from "vitest"

const calls: { module: string; fn: string; method: string; url: string }[] = []
let current = { module: "", fn: "" }
const record = (method: string) => async (url: string) => {
  calls.push({ ...current, method, url })
  return { data: {}, headers: {} }
}
vi.mock("@/lib/axios", () => {
  const api = { get: record("GET"), post: record("POST"), patch: record("PATCH"), put: record("PUT"), delete: record("DELETE") }
  return { default: api, api, getApiErrorMessage: (e: unknown) => String(e) }
})

const ROOT = path.resolve(__dirname, "../..")
const API_DIR = path.join(ROOT, "app/api")

/** Next.js-style resolution: returns the route.ts path serving `url`, or null. */
export function resolveRoute(url: string): string | null {
  const parts = url.split("?")[0].split("/").filter(Boolean)
  const walk = (dir: string, i: number): string | null => {
    if (i === parts.length) {
      const f = path.join(dir, "route.ts")
      return existsSync(f) ? f : null
    }
    const entries = readdirSync(dir).filter((e) => statSync(path.join(dir, e)).isDirectory())
    if (entries.includes(parts[i])) {
      const hit = walk(path.join(dir, parts[i]), i + 1)
      if (hit) return hit
    }
    for (const dyn of entries.filter((e) => /^\[[^.].*\]$/.test(e))) {
      const hit = walk(path.join(dir, dyn), i + 1)
      if (hit) return hit
    }
    return null
  }
  return walk(API_DIR, 0)
}

export function exportedMethods(routeFile: string): string[] {
  const src = readFileSync(routeFile, "utf8")
  return [...src.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1])
}

/** Functions whose first argument selects a route (placeholders would invent a URL that was never meant to exist). */
const ARG_OVERRIDES: Record<string, unknown[]> = {
  fetchReport: ["bookings", {}],
  downloadReport: ["payments", {}],
}

const apiModules = readdirSync(path.join(ROOT, "features")).flatMap((feature) =>
  readdirSync(path.join(ROOT, "features", feature))
    .filter((f) => f.endsWith(".api.ts"))
    .map((f) => `features/${feature}/${f}`),
)

beforeAll(async () => {
  for (const mod of apiModules) {
    const m = await import(/* @vite-ignore */ `@/${mod.replace(/\.ts$/, "")}`)
    for (const [fn, value] of Object.entries(m)) {
      if (typeof value !== "function") continue
      current = { module: mod, fn }
      const args = ARG_OVERRIDES[fn] ?? Array.from({ length: Math.max((value as Function).length, 1) }, (_, i) => `arg${i + 1}`)
      try { await (value as Function)(...args) } catch { /* only the recorded request matters */ }
    }
  }
})

describe("Client API ↔ route handlers", () => {
  it("found and exercised the client API modules", () => {
    expect(apiModules.length).toBeGreaterThanOrEqual(10)
    expect(calls.length).toBeGreaterThanOrEqual(40)
  })

  it("the resolver itself behaves like Next.js", () => {
    expect(resolveRoute("/bookings/abc/vendors")).toMatch(/bookings\/\[bookingId\]\/vendors\/route\.ts$/)
    expect(resolveRoute("/bookings/availability")).toMatch(/bookings\/availability\/route\.ts$/) // static beats [bookingId]
    expect(resolveRoute("/definitely/not/here")).toBeNull()
  })

  it("every request made by features/*/*.api.ts is served by a route that exports that method", () => {
    const problems = calls.flatMap((c) => {
      const file = resolveRoute(c.url)
      if (!file) return [`${c.module} → ${c.fn}(): ${c.method} /api${c.url} — no route file matches`]
      if (!exportedMethods(file).includes(c.method)) {
        return [`${c.module} → ${c.fn}(): ${c.method} /api${c.url} — ${path.relative(ROOT, file)} does not export ${c.method} (→ HTTP 405)`]
      }
      return []
    })
    expect(problems, `\n  ${problems.join("\n  ")}\n`).toEqual([])
  })
})
