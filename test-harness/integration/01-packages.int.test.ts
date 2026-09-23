// test-harness/integration/01-packages.int.test.ts
//
// Module 2 — Service packages (FR: admin maintains the catalogue; the public page lists active packages only).
import { GET as packageGET, PATCH as packagePATCH } from "@/app/api/packages/[packageId]/route"
import { GET as packagesGET, POST as packagesPOST } from "@/app/api/packages/route"
import { GET as publicGET } from "@/app/api/public/packages/route"
import { prisma } from "@/lib/prisma"
import { describe, expect, it } from "vitest"
import { RUN } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { actAs, signOut } from "./_support/session"

describe.sequential("Packages — admin catalogue and public listing", () => {
  let id = ""

  it("ADMIN creates a package → 201, audited", async () => {
    actAs("admin")
    const r = await call(packagesPOST, {
      body: { name: `${RUN} Garden Wedding`, description: "Outdoor", eventType: "WEDDING", price: 95_000.5, inclusions: ["Coordination", "Florals"] },
    })
    expectStatus(r, 201)
    expect(r.json).toMatchObject({ name: `${RUN} Garden Wedding`, eventType: "WEDDING", isActive: true })
    expect(Number(r.json.price)).toBe(95_000.5)
    id = r.json.id
    const audit = await prisma.auditLog.findFirst({ where: { action: "CREATE", metadata: { path: ["packageId"], equals: id } } })
    expect(audit).not.toBeNull()
  })

  it("every signed-in role can list packages; ?active=true lists it", async () => {
    for (const who of ["admin", "coordinator", "vendor", "client_anna"]) {
      actAs(who)
      const r = await call(packagesGET, { query: { active: "true" } })
      expectStatus(r, 200)
      expect(r.json.some((p: any) => p.id === id)).toBe(true)
    }
  })

  it("ADMIN opens and edits it (price, inclusions)", async () => {
    actAs("admin")
    const g = await call(packageGET, { params: { packageId: id } })
    expectStatus(g, 200)
    const r = await call(packagePATCH, { method: "PATCH", params: { packageId: id }, body: { price: 99_000, inclusions: ["Coordination", "Florals", "Lights"] } })
    expectStatus(r, 200)
    expect(Number(r.json.price)).toBe(99_000)
    expect(r.json.inclusions).toHaveLength(3)
  })

  it("the public listing shows it while active and hides it once deactivated", async () => {
    signOut()
    expect((await call(publicGET)).json.some((p: any) => p.id === id)).toBe(true)
    actAs("admin")
    expectStatus(await call(packagePATCH, { method: "PATCH", params: { packageId: id }, body: { isActive: false } }), 200)
    signOut()
    expect((await call(publicGET)).json.some((p: any) => p.id === id)).toBe(false)
  })
})
