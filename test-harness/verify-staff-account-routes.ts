// test-harness/verify-staff-account-routes.ts
//
// POST/PATCH/DELETE /api/staff-accounts — validation, self-protection, last-admin protection, and the
// reactivation/Clerk-unlock fix. Drives the real route handlers (Clerk is stubbed by test-harness/clerk.stub.ts
// via SEED_CLERK_STUB / a lightweight in-process fake — see below).
import "dotenv/config"
import { GET as listGET, POST as createPOST } from "@/app/api/staff-accounts/route"
import { DELETE as deactivateDELETE, PATCH as updatePATCH } from "@/app/api/staff-accounts/[id]/route"
import { prisma } from "@/lib/prisma"
import { resetClerkCallLog } from "./clerk-client.stub"

const TAG = "teststaffacct"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log("  ✅ ", n) } else { fails.push(n); console.log("  ❌ ", n, d !== undefined ? "→ " + JSON.stringify(d) : "") } }
const section = (t: string) => console.log(`\n── ${t}`)
const as = (role?: string, user?: string) => { role ? (process.env.TEST_ROLE = role) : delete process.env.TEST_ROLE; user ? (process.env.TEST_USER = user) : delete process.env.TEST_USER }
const json = (method: string, body?: unknown) => new Request("http://x", { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })
const P = (id: string) => ({ params: Promise.resolve({ id }) })
const body = async (r: Response) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }) as any

const clerkCalls = () => (globalThis as any).__clerkCalls
async function cleanup() { await prisma.user.deleteMany({ where: { username: { startsWith: TAG } } }) }

async function main() {
  await cleanup()
  resetClerkCallLog()
  as("ADMIN", "admin")

  section("Validation")
  let r = await body(await createPOST(json("POST", { username: "ab", password: "longenough1", fullName: "X", role: "COORDINATOR" })))
  check("username too short → 422", r.status === 422, r)
  r = await body(await createPOST(json("POST", { username: `${TAG}_v1`, password: "short", fullName: "X", role: "COORDINATOR" })))
  check("password too short → 422", r.status === 422, r)
  r = await body(await createPOST(json("POST", { username: `${TAG}_v2`, password: "longenough1", fullName: "X", role: "CLIENT" })))
  check("role=CLIENT is rejected — this endpoint is for STAFF accounts only", r.status === 422, r)
  r = await body(await createPOST(json("POST", { username: `${TAG}_v3`, password: "longenough1", fullName: "", role: "COORDINATOR" })))
  check("empty full name → 422", r.status === 422, r)

  section("Create — happy path")
  r = await body(await createPOST(json("POST", { username: `${TAG}_coord1`, password: "longenough1", fullName: "Test Coordinator", role: "COORDINATOR" })))
  check("valid input → 201", r.status === 201 && r.role === "COORDINATOR" && r.isActive === true, r)
  check("…and Clerk received the createUser call", clerkCalls().createUser === 1, clerkCalls())
  const coordId: string = r.id
  r = await body(await createPOST(json("POST", { username: `${TAG}_coord1`, password: "longenough1", fullName: "Dup", role: "COORDINATOR" })))
  check("duplicate username → 409", r.status === 409, r)

  as("COORDINATOR", "coordinator")
  r = await body(await createPOST(json("POST", { username: `${TAG}_x`, password: "longenough1", fullName: "X", role: "COORDINATOR" })))
  check("a COORDINATOR cannot create staff accounts (403 — admin only)", r.status === 403, r)
  as("ADMIN", "admin")

  section("PATCH — validation and role update")
  r = await body(await updatePATCH(json("PATCH", { role: "CLIENT" }), P(coordId)))
  check("promoting/moving to role=CLIENT is rejected → 422", r.status === 422, r)
  r = await body(await updatePATCH(json("PATCH", { fullName: "Renamed Coordinator" }), P(coordId)))
  check("editing only the name → 200, role untouched", r.status === 200 && r.fullName === "Renamed Coordinator" && r.role === "COORDINATOR", r)
  r = await body(await updatePATCH(json("PATCH", {}), P("does-not-exist")))
  check("unknown account → 404", r.status === 404, r)

  section("Self-protection")
  const adminSelf = await prisma.user.findUnique({ where: { username: "admin" } })
  r = await body(await updatePATCH(json("PATCH", { role: "COORDINATOR" }), P(adminSelf!.id)))
  check("an admin cannot change their OWN role → 400", r.status === 400 && /cannot change your own role/i.test(r.error ?? ""), r)
  r = await body(await updatePATCH(json("PATCH", { isActive: false }), P(adminSelf!.id)))
  check("an admin cannot deactivate their OWN account via PATCH → 400", r.status === 400, r)
  r = await body(await deactivateDELETE(json("DELETE"), P(adminSelf!.id)))
  check("an admin cannot deactivate their OWN account via DELETE → 400", r.status === 400, r)
  r = await body(await updatePATCH(json("PATCH", { fullName: "Still Admin" }), P(adminSelf!.id)))
  check("…but CAN edit their own full name", r.status === 200 && r.fullName === "Still Admin", r)
  await prisma.user.update({ where: { id: adminSelf!.id }, data: { fullName: adminSelf!.fullName } })

  section("Last-admin protection")
  const otherAdmins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true, id: { not: adminSelf!.id } } })
  await prisma.user.updateMany({ where: { id: { in: otherAdmins.map((a) => a.id) } }, data: { isActive: false } })
  // The ACTING user (admin, via TEST_USER) is itself an active admin and would otherwise always count as
  // "another admin" relative to soleAdmin. The auth stub only checks TEST_ROLE/TEST_USER, not isActive in the
  // database, so deactivating the real admin row here still lets the stub authenticate as them.
  await prisma.user.update({ where: { id: adminSelf!.id }, data: { isActive: false } })
  try {
    const soleAdmin = await prisma.user.create({ data: { clerkId: `clerk_${TAG}_sole`, username: `${TAG}_sole_admin`, fullName: "Sole Admin", role: "ADMIN" } })
    r = await body(await updatePATCH(json("PATCH", { isActive: false }), P(soleAdmin.id)))
    check("deactivating the LAST active admin → 400", r.status === 400 && /last active admin/i.test(r.error ?? ""), r)
    r = await body(await updatePATCH(json("PATCH", { role: "COORDINATOR" }), P(soleAdmin.id)))
    check("demoting the LAST active admin away from ADMIN → 400", r.status === 400 && /last active admin/i.test(r.error ?? ""), r)
    check("…the account is untouched by both blocked attempts", (await prisma.user.findUnique({ where: { id: soleAdmin.id } }))?.role === "ADMIN")
    const second = await prisma.user.create({ data: { clerkId: `clerk_${TAG}_second`, username: `${TAG}_second_admin`, fullName: "Second Admin", role: "ADMIN" } })
    r = await body(await updatePATCH(json("PATCH", { isActive: false }), P(soleAdmin.id)))
    check("…but with a SECOND active admin present, deactivating the first now succeeds", r.status === 200, r)
    await prisma.user.delete({ where: { id: second.id } })
  } finally {
    await prisma.user.deleteMany({ where: { username: { startsWith: `${TAG}_sole` } } })
    await prisma.user.updateMany({ where: { id: { in: otherAdmins.map((a) => a.id) } }, data: { isActive: true } })
    await prisma.user.update({ where: { id: adminSelf!.id }, data: { isActive: true } })
  }

  section("Deactivate / reactivate")
  const beforeLock = clerkCalls().lockUser
  r = await body(await deactivateDELETE(json("DELETE"), P(coordId)))
  check("DELETE deactivates (soft) → 200, isActive false", r.status === 200 && r.isActive === false, r)
  check("…and Clerk's lockUser was called", clerkCalls().lockUser === beforeLock + 1)
  r = await body(await deactivateDELETE(json("DELETE"), P("does-not-exist")))
  check("deactivating an unknown account → 404", r.status === 404, r)
  const beforeUnlock = clerkCalls().unlockUser
  r = await body(await updatePATCH(json("PATCH", { isActive: true }), P(coordId)))
  check("reactivating → 200, isActive true", r.status === 200 && r.isActive === true, r)
  check("…and Clerk's unlockUser was called (the original bug: reactivating never told Clerk to unlock)", clerkCalls().unlockUser === beforeUnlock + 1)

  section("GET — staff only, never clients")
  const list = await listGET()
  const listed = await list.json()
  check("the list never includes a CLIENT role", Array.isArray(listed) && listed.every((u: any) => u.role !== "CLIENT"))
  as("VENDOR", "vendor")
  check("a VENDOR cannot list staff accounts (403 — admin only)", (await listGET()).status === 403)
  as()
  check("signed out → 403", (await listGET()).status === 403)

  await cleanup()
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) }).finally(() => prisma.$disconnect())
