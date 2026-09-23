// test-harness/unit/server-actions.unit.test.ts
//
// SECURITY (FINDINGS.md #2): a module that starts with "use server" turns EVERY export into a Server Action that any
// browser can call directly with any arguments — skipping the route handler's requireRole / ownership checks.
// The *.query.ts modules take raw ids and write to the database, so they must be plain server modules.
// (features/bookings/bookings.transition.ts already documents this rule.)
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = path.resolve(__dirname, "../..")
const queryModules = readdirSync(path.join(ROOT, "features")).flatMap((f) =>
  readdirSync(path.join(ROOT, "features", f)).filter((x) => x.endsWith(".query.ts")).map((x) => `features/${f}/${x}`),
)

describe("Data-access modules are not exposed as Server Actions", () => {
  it("found the query modules", () => expect(queryModules.length).toBeGreaterThanOrEqual(8))

  it("no *.query.ts file declares \"use server\"", () => {
    const exposed = queryModules.filter((f) => /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*["']use server["']/.test(readFileSync(path.join(ROOT, f), "utf8")))
    expect(exposed, `\n  These modules expose every export as a public Server Action:\n  ${exposed.join("\n  ")}\n`).toEqual([])
  })
})
