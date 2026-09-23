// test-harness/integration/15-portal-check-repair.int.test.ts
//
// Sign-in after a password reset (reported bug): the account signed in at Clerk, but POST /api/auth/portal-check
// answered a bare 401 because the account had NO ROW in our User table, and the login page bounced to "/".
//
// portal-check now REPAIRS a missing row (lib/sync-user.ts) and answers with distinct codes. These tests drive the
// real route against the real database; only Clerk is faked (registerClerkUser / deleteClerkUser).
import { POST } from "@/app/api/auth/portal-check/route"
import { prisma } from "@/lib/prisma"
import { describe, expect, it } from "vitest"
import { call, expectStatus } from "./_support/http"
import { clerkCalls, deleteClerkUser, fakeClerkUser, registerClerkUser } from "./_support/mocks/clerk-client"
import { actAs, actAsClerkOnly, session, signOut } from "./_support/session"

const uid = () => `user_itest_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const email = (id: string) => ({ id: `idn_${id}`, emailAddress: `${id}@example.com`, verification: { status: "verified" } })
const check = (portal: "client" | "staff") => call(POST, { body: { portal } })

describe("portal-check — the account row is missing (e.g. webhook never ran)", () => {
  it("a self-signed-up CLIENT (no role in Clerk yet): row created, CLIENT written back to Clerk, → /portal", async () => {
    const id = uid()
    registerClerkUser({ id, firstName: "Reset", lastName: "Tester", emailAddresses: [email(id)], primaryEmailAddressId: `idn_${id}`, publicMetadata: {} })
    actAsClerkOnly(id)
    const metaBefore = clerkCalls().updateUserMetadata

    const r = await check("client")
    expectStatus(r, 200)
    expect(r.json).toEqual({ ok: true, destination: "/portal" })

    const row = await prisma.user.findUniqueOrThrow({ where: { clerkId: id } })
    expect(row).toMatchObject({ role: "CLIENT", fullName: "Reset Tester", email: `${id}@example.com`, isActive: true })
    expect(clerkCalls().updateUserMetadata).toBe(metaBefore + 1)
    expect(fakeClerkUser(id)?.publicMetadata).toEqual({ role: "CLIENT" })

    const audit = await prisma.auditLog.findFirst({ where: { userId: row.id, metadata: { path: ["event"], equals: "ACCOUNT_SYNCED_AT_SIGN_IN" } } })
    expect(audit?.description).toMatch(/record created at sign-in/)
  })

  it("the SAME account signing in again → uses the row (no duplicate, no second repair)", async () => {
    const id = uid()
    registerClerkUser({ id, emailAddresses: [email(id)], primaryEmailAddressId: `idn_${id}` })
    actAsClerkOnly(id)
    expectStatus(await check("client"), 200)
    expectStatus(await check("client"), 200)
    expect(await prisma.user.count({ where: { clerkId: id } })).toBe(1)
    expect(await prisma.auditLog.count({ where: { metadata: { path: ["clerkUserId"], equals: id } } })).toBe(1)
  })

  it("a STAFF account whose role is in Clerk metadata → row created with that role, → its dashboard", async () => {
    const id = uid()
    registerClerkUser({ id, username: id.replace("user_", ""), firstName: "Staff", publicMetadata: { role: "COORDINATOR" } })
    actAsClerkOnly(id, "COORDINATOR")
    const r = await check("staff")
    expectStatus(r, 200)
    expect(r.json.destination).toBe("/staff/coordinator")
    expect((await prisma.user.findUniqueOrThrow({ where: { clerkId: id } })).role).toBe("COORDINATOR")
  })

  it("the repaired row still obeys the portal rule: a client repaired at the STAFF login is refused (WRONG_PORTAL)", async () => {
    const id = uid()
    registerClerkUser({ id, emailAddresses: [email(id)], primaryEmailAddressId: `idn_${id}` })
    actAsClerkOnly(id)
    const r = await check("staff")
    expect(r.status).toBe(403)
    expect(r.json.code).toBe("WRONG_PORTAL")
  })
})

describe("portal-check — the Clerk account was re-created (database re-seeded, old Clerk user deleted)", () => {
  it("re-links the existing row (same username, old Clerk id gone): keeps its id, role and history", async () => {
    const oldId = uid(); const newId = uid(); const username = `itest_relink_${Date.now().toString(36)}`
    const row = await prisma.user.create({ data: { clerkId: oldId, username, fullName: "Relink Coordinator", role: "COORDINATOR" } })
    deleteClerkUser(oldId)
    registerClerkUser({ id: newId, username, publicMetadata: {} })
    actAsClerkOnly(newId, "COORDINATOR")

    const r = await check("staff")
    expectStatus(r, 200)
    expect(r.json.destination).toBe("/staff/coordinator")
    const after = await prisma.user.findUniqueOrThrow({ where: { id: row.id } })
    expect(after.clerkId).toBe(newId)                                   // same row, new identity
    expect(fakeClerkUser(newId)?.publicMetadata).toEqual({ role: "COORDINATOR" }) // role written back from OUR database
    expect(await prisma.auditLog.count({ where: { userId: row.id, metadata: { path: ["event"], equals: "ACCOUNT_RELINKED" } } })).toBe(1)
  })

  it("re-links by VERIFIED e-mail too", async () => {
    const oldId = uid(); const newId = uid(); const addr = `relink.${Date.now().toString(36)}@example.com`
    const row = await prisma.user.create({ data: { clerkId: oldId, email: addr, fullName: "Relink Client", role: "CLIENT" } })
    deleteClerkUser(oldId)
    registerClerkUser({ id: newId, emailAddresses: [{ id: "e1", emailAddress: addr, verification: { status: "verified" } }], primaryEmailAddressId: "e1" })
    actAsClerkOnly(newId)
    expectStatus(await check("client"), 200)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: row.id } })).clerkId).toBe(newId)
  })
})

describe("portal-check — refusals are explicit (never a bare 401 that bounces to /)", () => {
  it("never takes over a record that belongs to ANOTHER LIVE Clerk account → 403 ACCOUNT_NOT_FOUND, session revoked", async () => {
    const liveOwner = uid(); const intruder = uid(); const addr = `taken.${Date.now().toString(36)}@example.com`
    const row = await prisma.user.create({ data: { clerkId: liveOwner, email: addr, fullName: "Owner", role: "CLIENT" } })
    registerClerkUser({ id: liveOwner, emailAddresses: [{ id: "o", emailAddress: addr, verification: { status: "verified" } }], primaryEmailAddressId: "o" })
    registerClerkUser({ id: intruder, emailAddresses: [{ id: "i", emailAddress: addr, verification: { status: "verified" } }], primaryEmailAddressId: "i" })
    actAsClerkOnly(intruder)
    const before = session.revocations

    const r = await check("client")
    expect(r.status).toBe(403)
    expect(r.json.code).toBe("ACCOUNT_NOT_FOUND")
    expect(session.revocations).toBe(before + 1)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: row.id } })).clerkId).toBe(liveOwner) // untouched
    expect(await prisma.user.count({ where: { clerkId: intruder } })).toBe(0)
  })

  it("an UNVERIFIED e-mail match is not enough to re-link", async () => {
    const oldId = uid(); const newId = uid(); const addr = `unverified.${Date.now().toString(36)}@example.com`
    const row = await prisma.user.create({ data: { clerkId: oldId, email: addr, fullName: "Old", role: "CLIENT" } })
    deleteClerkUser(oldId)
    registerClerkUser({ id: newId, emailAddresses: [{ id: "u", emailAddress: addr, verification: { status: "unverified" } }], primaryEmailAddressId: "u" })
    actAsClerkOnly(newId)
    const r = await check("client")
    expect(r.status).toBe(403)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: row.id } })).clerkId).toBe(oldId)
  })

  it("the Clerk account itself does not exist → 403 ACCOUNT_NOT_FOUND (audited)", async () => {
    const id = uid()
    deleteClerkUser(id)
    actAsClerkOnly(id)
    const r = await check("client")
    expect(r.status).toBe(403)
    expect(r.json.code).toBe("ACCOUNT_NOT_FOUND")
    expect(await prisma.auditLog.count({ where: { metadata: { path: ["clerkUserId"], equals: id } } })).toBe(1)
  })

  it("no session at all → 401 with code NO_SESSION", async () => {
    signOut()
    const r = await check("client")
    expect(r.status).toBe(401)
    expect(r.json.code).toBe("NO_SESSION")
  })

  it("the normal path is unchanged: a seeded client at /sign-in → /portal", async () => {
    actAs("client_anna")
    const r = await check("client")
    expectStatus(r, 200)
    expect(r.json.destination).toBe("/portal")
  })
})
