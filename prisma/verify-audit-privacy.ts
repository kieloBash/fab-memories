// prisma/verify-audit-privacy.ts
/**
 * Personal data must not enter the (immutable) audit trail.
 *
 *   npx tsx prisma/verify-audit-privacy.ts
 *
 * 1. the redactor and auditChanges() (unit)   2. through the REAL audit writer + hash chain (database)
 * 3. a source scan: no audit call embeds a person's name, or copies a raw payload/free text.
 */
import "dotenv/config"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { verifyAuditChainIntegrity } from "@/features/audit/audit.query"
import { logAction } from "@/lib/audit/log"
import { REDACTED, auditChanges, redactMetadata, redactText } from "@/lib/audit/redact"
import { prisma } from "@/lib/prisma"

let passed = 0; const failures: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { passed++; console.log(`  ✅  ${n}`) } else { failures.push(n); console.log(`  ❌  ${n}${d !== undefined ? `\n        → ${JSON.stringify(d)}` : ""}`) } }
const section = (t: string) => console.log(`\n── ${t}`)

// ── source scanner (exported logic so it can be self-tested) ──────
function findAuditCalls(src: string): string[] {
  const out: string[] = []
  for (const m of src.matchAll(/(?:\baudit|\blogAction|\bwriteAuditEntry\(\s*tx\s*,)\(\s*\{/g)) {
    let i = m.index! + m[0].length - 1, depth = 0, k = i
    for (; k < src.length; k++) { if (src[k] === "{") depth++; else if (src[k] === "}") { depth--; if (depth === 0) break } }
    out.push(src.slice(i, k + 1))
  }
  return out
}
function violations(call: string): string[] {
  const v: string[] = []
  const desc = call.match(/description:\s*(`[^`]*`|"[^"]*"|'[^']*')/)?.[1] ?? ""
  if (/\.(fullName|username|email|firstName|lastName)\b/.test(desc)) v.push("description embeds a person's name/e-mail")
  const meta = call.match(/metadata:\s*([\s\S]*)$/)?.[1] ?? ""
  if (/\bchanges:\s*(?!\s*auditChanges\()/.test(meta)) v.push("metadata copies a raw payload as `changes` (use auditChanges())")
  if (/\b(reason|notes?|password|phone|email|address|venue)\s*:/.test(meta)) v.push("metadata has a free-text/personal key")
  return v
}
function walk(dir: string, out: string[] = []) {
  for (const f of readdirSync(dir)) {
    if (["node_modules", "generated", ".next", "test-harness"].includes(f)) continue
    const p = join(dir, f), st = statSync(p)
    if (st.isDirectory()) walk(p, out); else if (/\.(ts|tsx)$/.test(f)) out.push(p)
  }
  return out
}

async function main() {
  section("Redactor (unit)")
  const r = redactMetadata({
    bookingId: "cm9abc123", amount: 5000, status: "CONFIRMED", code: "DATE_TAKEN",
    clientPhone: "09171234567", email: "anna@example.com", notes: "Call after 5pm", venue: "Secret Garden", venueFormattedAddress: "1 Rizal St",
    password: "hunter2", apiToken: "abc", accessToken: "def", fullName: "Anna Reyes", search: "anna",
    nested: { contactEmail: "x@y.co", deep: [{ address: "12 Main" }, { ok: 1 }] },
  }) as any
  check("safe business fields are kept (ids, amounts, status, codes)", r.bookingId === "cm9abc123" && r.amount === 5000 && r.status === "CONFIRMED" && r.code === "DATE_TAKEN", r)
  for (const k of ["clientPhone", "email", "notes", "venue", "venueFormattedAddress", "password", "apiToken", "accessToken", "fullName", "search"])
    check(`key "${k}" is redacted`, r[k] === REDACTED, r[k])
  check("…also inside nested objects and arrays", r.nested.contactEmail === REDACTED && r.nested.deep[0].address === REDACTED && r.nested.deep[1].ok === 1, r.nested)
  const t = redactText("Call 09171234567 or +63 917 123 4567 or 0917-123-4567, mail anna@example.com. Booking cm09171234567abcde ref 20260501")
  check("e-mail addresses in free text are masked", !/anna@example\.com/.test(t) && t.includes("[email]"), t)
  const withoutId = t.replace("cm09171234567abcde", "")   // the id legitimately contains digits
  check("PH mobile numbers in free text are masked (3 formats)", !/9171234567|917 123 4567|917-123-4567/.test(withoutId) && (t.match(/\[phone\]/g) ?? []).length === 3, t)
  check("record ids and dates containing digits are NOT mangled", t.includes("cm09171234567abcde") && t.includes("20260501"), t)
  check("non-objects pass through", redactMetadata(5) === 5 && redactMetadata(null) === null && redactMetadata(true) === true)

  section("auditChanges() — describe an edit without copying it")
  const c = auditChanges({ clientPhone: "09171234567", notes: "Call after 5pm", venue: "Secret Garden", guestCount: 80, status: "CONFIRMED", eventDate: "2030-01-01", skipped: undefined })
  check("lists WHICH fields changed (sorted)", JSON.stringify(c.fields) === JSON.stringify(["clientPhone", "eventDate", "guestCount", "notes", "status", "venue"]), c.fields)
  check("keeps only business values (guestCount, status, eventDate)", JSON.stringify(c.values) === JSON.stringify({ guestCount: 80, status: "CONFIRMED", eventDate: "2030-01-01" }), c.values)
  check("never keeps phone, notes or venue text", !JSON.stringify(c).includes("0917") && !JSON.stringify(c).includes("Call after") && !JSON.stringify(c).includes("Secret Garden"))
  check("garbage in → empty out", auditChanges(null).fields.length === 0 && auditChanges("x").fields.length === 0 && auditChanges([1]).fields.length === 0)

  section("Through the REAL audit writer (database + hash chain)")
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  const tag = `privacy-test-${Date.now()}`
  await logAction({
    userId: admin!.id, action: "UPDATE", module: "BOOKING",
    description: `${tag} contacted anna@example.com on 09171234567`,
    metadata: { bookingId: "b-1", clientPhone: "09170000000", notes: "Bring the cake", changes: { venue: "Secret Garden", guestCount: 5 }, password: "hunter2" },
  })
  const row = await prisma.auditLog.findFirst({ where: { description: { startsWith: tag } }, orderBy: { sequence: "desc" } })
  const stored = JSON.stringify(row)
  check("the entry was written", !!row)
  check("description: e-mail and phone were masked BEFORE storing", !!row && !/anna@example|09171234567/.test(row.description) && row.description.includes("[email]") && row.description.includes("[phone]"), row?.description)
  check("metadata: phone, notes, venue and password never reached the database", !/09170000000|Bring the cake|Secret Garden|hunter2/.test(stored), (row?.metadata as any))
  check("metadata: the business fields survived", (row?.metadata as any)?.bookingId === "b-1" && (row?.metadata as any)?.changes?.guestCount === 5)
  const chain = await verifyAuditChainIntegrity()
  check("hash chain still verifies (redacted values are what was hashed)", chain.isValid, chain)

  section("Source scan — no audit call embeds a name or copies a raw payload")
  const bad = 'audit({ userId: a, action: "UPDATE", module: "BOOKING", description: `Client "${actor.fullName}" edited`, metadata: { changes: parsed.data, reason: x } })'
  check("scanner self-test: it DETECTS a deliberately bad call (name + raw payload + free text)", violations(findAuditCalls(bad)[0]).length === 3, violations(findAuditCalls(bad)[0]))
  const good = 'audit({ userId: a, action: "UPDATE", module: "BOOKING", description: `${actor.role} edited a booking`, metadata: { bookingId, changes: auditChanges(parsed.data) } })'
  check("scanner self-test: it ACCEPTS the correct pattern", violations(findAuditCalls(good)[0]).length === 0)
  let calls = 0; const found: string[] = []
  for (const dir of ["app", "features", "lib"]) for (const f of walk(dir)) {
    for (const call of findAuditCalls(readFileSync(f, "utf8"))) { calls++; for (const v of violations(call)) found.push(`${f}: ${v}`) }
  }
  check(`scanned ${calls} audit calls across the codebase`, calls > 30, calls)
  check("no audit call embeds a name, e-mail or free text, or copies a raw payload", found.length === 0, found)

  console.log(`\n${"═".repeat(60)}\n  ${passed} passed, ${failures.length} failed`)
  if (failures.length) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
