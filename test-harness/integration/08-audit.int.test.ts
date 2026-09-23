// test-harness/integration/08-audit.int.test.ts
//
// Module 7 — Audit trail: an action leaves an entry; admins browse / filter / page it; the hash chain verifies.
import { GET as auditGET } from "@/app/api/audit/route"
import { GET as statsGET } from "@/app/api/audit/stats/route"
import { GET as verifyGET } from "@/app/api/audit/verify/route"
import { POST as vendorsPOST } from "@/app/api/vendors/route"
import { describe, expect, it } from "vitest"
import { RUN } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { actAs } from "./_support/session"

describe.sequential("Audit trail", () => {
  let vendorId = ""

  it("a state-changing action writes an entry that the admin can find by module + action", async () => {
    actAs("admin")
    vendorId = (await call(vendorsPOST, { body: { name: `${RUN} Audit Probe`, category: "OTHER" } })).json.id
    const r = await call(auditGET, { query: { module: "VENDOR", action: "CREATE", pageSize: 50 } })
    expectStatus(r, 200)
    const hit = r.json.entries.find((e: any) => JSON.stringify(e).includes(vendorId))
    expect(hit).toMatchObject({ module: "VENDOR", action: "CREATE", status: "SUCCESS", userName: "System Administrator" })
    expect(hit.hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("entries are newest-first and paged", async () => {
    actAs("admin")
    const r = await call(auditGET, { query: { page: 1, pageSize: 5 } })
    expectStatus(r, 200)
    expect(r.json.entries).toHaveLength(5)
    const seq = r.json.entries.map((e: any) => e.sequence)
    expect([...seq].sort((a, b) => b - a)).toEqual(seq)
  })

  it("the filter options list the users who appear in the trail", async () => {
    actAs("admin")
    const r = await call(auditGET, { query: { options: "true" } })
    expectStatus(r, 200)
    expect(r.json.users.length).toBeGreaterThan(0)
  })

  it("stats summarise the trail", async () => {
    actAs("admin")
    const r = await call(statsGET)
    expectStatus(r, 200)
    expect(r.json).toEqual(expect.objectContaining({ totalEntries: expect.any(Number), entriesToday: expect.any(Number), failureCount: expect.any(Number) }))
    expect(r.json.entriesToday).toBeGreaterThan(0)
  })

  it("the full hash-chain verification passes (and is itself recorded)", async () => {
    actAs("admin")
    const r = await call(verifyGET)
    expectStatus(r, 200)
    expect(r.json).toMatchObject({ isValid: true, brokenAtSequence: null })
    const after = await call(auditGET, { query: { module: "REPORT", action: "VIEW", pageSize: 5 } })
    expect(after.json.entries[0].description).toMatch(/integrity check — result: VALID/)
  })
})
