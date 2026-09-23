// test-harness/unit/page-links.unit.test.ts
//
// CONTRACT: every internal link / router.push to /staff/** or /portal/** must point at a page that exists.
// Scans the source (comments ignored) and resolves each target against app/(pages)/** like Next.js does
// (route groups "(x)" are invisible; [param] matches one segment; [[...x]] / [...x] match the rest).
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = path.resolve(__dirname, "../..")

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (["node_modules", ".next", "generated", "test-harness"].includes(e)) continue
    const p = path.join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx?|jsx?)$/.test(e)) out.push(p)
  }
  return out
}

const pages = walk(path.join(ROOT, "app/(pages)"))
  .filter((f) => f.endsWith("/page.tsx"))
  .map((f) => path.relative(path.join(ROOT, "app/(pages)"), path.dirname(f)).split(path.sep).filter((s) => !/^\(.*\)$/.test(s)))

export function pageExists(url: string): boolean {
  const parts = url.split(/[?#]/)[0].split("/").filter(Boolean)
  return pages.some((segs) => {
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i]
      if (s.startsWith("[[...")) return true
      if (s.startsWith("[...")) return i < parts.length
      if (i >= parts.length) return false
      if (!s.startsWith("[") && s !== parts[i]) return false
    }
    return segs.length === parts.length
  })
}

const LINK = /(?:href=|push\(|replace\(|href:\s*|link:\s*|redirect\()\s*[{(]?\s*([`"'])(\/(?:staff|portal)[^`"']*)\1/g

function internalLinks() {
  const found: { file: string; line: number; url: string }[] = []
  for (const file of walk(ROOT)) {
    const src = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")) // block comments
      .replace(/^\s*\/\/.*$/gm, "")                                   // line comments
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")                      // JSX comments
    for (const m of src.matchAll(LINK)) {
      found.push({ file: path.relative(ROOT, file), line: src.slice(0, m.index).split("\n").length, url: m[2].replace(/\$\{[^}]*\}/g, "x") })
    }
  }
  return found
}

describe("Internal links ↔ pages", () => {
  it("the matcher knows the real pages", () => {
    expect(pageExists("/staff/admin/bookings/abc")).toBe(true)
    expect(pageExists("/portal/bookings/abc/payment")).toBe(true)
    expect(pageExists("/staff/admin/nope")).toBe(false)
  })

  it("every /staff/** and /portal/** link in the source resolves to a page", () => {
    const links = internalLinks()
    expect(links.length).toBeGreaterThan(20)
    const dead = links.filter((l) => !pageExists(l.url)).map((l) => `${l.url}  ←  ${l.file}:${l.line}`)
    expect(dead, `\n  ${dead.join("\n  ")}\n`).toEqual([])
  })
})
