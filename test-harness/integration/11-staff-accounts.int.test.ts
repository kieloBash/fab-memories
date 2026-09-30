// test-harness/integration/11-staff-accounts.int.test.ts
//
// Module 1 — Staff account management (admin): create → edit → deactivate → reactivate, mirrored to Clerk.
// Accounts created here are left DEACTIVATED afterwards (deleting a user would disturb the audit hash chain).
import { DELETE as accountDELETE, PATCH as accountPATCH } from "@/app/api/staff-accounts/[id]/route"
import { GET as accountsGET, POST as accountsPOST } from "@/app/api/staff-accounts/route"
import { prisma } from "@/lib/prisma"
import { describe, expect, it } from "vitest"
import { uniqueUsername } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { clerkCalls } from "./_support/mocks/clerk-client"
import { actAs } from "./_support/session"

describe.sequential("Staff accounts", () => {
  const username = uniqueUsername()
  let id = ""

  it("ADMIN creates a COORDINATOR account → 201, Clerk user created with the role", async () => {
    actAs("admin")
    const before = clerkCalls().createUser
    const r = await call(accountsPOST, { body: { username, password: "Sup3r-Secret!", fullName: "Itest Coordinator", role: "COORDINATOR" } })
    expectStatus(r, 201)
    expect(r.json).toMatchObject({ username, role: "COORDINATOR", isActive: true })
    expect(clerkCalls().createUser).toBe(before + 1)
    id = r.json.id
  })

  it("the account appears in the staff list (clients never do)", async () => {
    actAs("admin")
    const r = await call(accountsGET)
    expectStatus(r, 200)
    expect(r.json.some((u: any) => u.id === id)).toBe(true)
    expect(r.json.every((u: any) => u.role !== "CLIENT")).toBe(true)
  })

  it("the new coordinator can already sign in and use their pages", async () => {
    actAs(username, "COORDINATOR")
    const { GET } = await import("@/app/api/staff/my-schedule/route")
    expectStatus(await call(GET), 200)
  })

  it("VENDOR is no longer an assignable role → 422 (vendors have no accounts)", async () => {
    actAs("admin")
    const r = await call(accountPATCH, { method: "PATCH", params: { id }, body: { role: "VENDOR" } })
    expectStatus(r, 422)
  })

  it("ADMIN renames them and changes the role to ADMIN → Clerk metadata updated", async () => {
    actAs("admin")
    const before = clerkCalls().updateUserMetadata
    const r = await call(accountPATCH, { method: "PATCH", params: { id }, body: { fullName: "Itest Admin", role: "ADMIN" } })
    expectStatus(r, 200)
    expect(r.json).toMatchObject({ fullName: "Itest Admin", role: "ADMIN" })
    expect(clerkCalls().updateUserMetadata).toBe(before + 1)
  })

  it("ADMIN deactivates the account → isActive false, Clerk user locked", async () => {
    actAs("admin")
    const before = clerkCalls().lockUser
    expectStatus(await call(accountDELETE, { method: "DELETE", params: { id } }), 200)
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).isActive).toBe(false)
    expect(clerkCalls().lockUser).toBe(before + 1)
  })

  it("ADMIN reactivates it → isActive true, Clerk user unlocked", async () => {
    actAs("admin")
    const before = clerkCalls().unlockUser
    const r = await call(accountPATCH, { method: "PATCH", params: { id }, body: { isActive: true } })
    expectStatus(r, 200)
    expect(r.json.isActive).toBe(true)
    expect(clerkCalls().unlockUser).toBe(before + 1)
  })
})
