// test-harness/verify-portal-routes.ts
//
// POST /api/auth/portal-check — "staff only at /staff-login, clients only at /sign-in".
// Drives the REAL route handler (auth stubbed by run-route-tests.sh; session revocation is recorded, not sent to Clerk).
import "dotenv/config"
import { POST } from "@/app/api/auth/portal-check/route"
import { prisma } from "@/lib/prisma"

let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log("  ✅ ", n) } else { fails.push(n); console.log("  ❌ ", n, d !== undefined ? "→ " + JSON.stringify(d) : "") } }
const section = (t: string) => console.log(`\n── ${t}`)
const as = (role?: string, user?: string, extra: Record<string, string> = {}) => {
  role ? (process.env.TEST_ROLE = role) : delete process.env.TEST_ROLE
  user ? (process.env.TEST_USER = user) : delete process.env.TEST_USER
  delete process.env.TEST_GHOST; delete process.env.TEST_REVOKE_FAIL
  for (const [k, v] of Object.entries(extra)) process.env[k] = v
}
const post = async (portal: unknown) => {
  const r = await POST(new Request("http://x/api/auth/portal-check", { method: "POST", headers: { "content-type": "application/json" }, body: portal === undefined ? "not json" : JSON.stringify(portal) }))
  return { http: r.status, ...(await r.json()) } as { http: number; ok?: boolean; destination?: string; code?: string; error?: string; portal?: string; correctPath?: string }
}
const revokes = () => (globalThis as any).__revokeCalls ?? 0
const failureCount = (userId: string, event: string) =>
  prisma.auditLog.count({ where: { userId, action: "LOGIN", module: "AUTH", status: "FAILURE", metadata: { path: ["event"], equals: event } } })

async function main() {
  const [anna, admin, coord, vendor] = await Promise.all([
    prisma.user.findUnique({ where: { username: "client_anna" } }), prisma.user.findUnique({ where: { username: "admin" } }),
    prisma.user.findUnique({ where: { username: "coordinator" } }), prisma.user.findFirst({ where: { role: "VENDOR", isActive: true } }),
  ])
  if (!anna || !admin || !coord) throw new Error("Run the base seed first.")

  section("Right portal → in")
  as("CLIENT", "client_anna"); let before = revokes()
  let r = await post({ portal: "client" })
  check("client at /sign-in → 200 with destination /portal", r.http === 200 && r.ok === true && r.destination === "/portal", r)
  as("ADMIN", "admin");         r = await post({ portal: "staff" })
  check("admin at /staff-login → 200, destination /staff/admin", r.http === 200 && r.destination === "/staff/admin", r)
  as("COORDINATOR", "coordinator"); r = await post({ portal: "staff" })
  check("coordinator at /staff-login → 200, destination /staff/coordinator", r.http === 200 && r.destination === "/staff/coordinator", r)
  if (vendor) { as("VENDOR", vendor.username!); r = await post({ portal: "staff" }); check("vendor at /staff-login → 200, destination /staff/vendor", r.http === 200 && r.destination === "/staff/vendor", r) }
  else console.log("  (no VENDOR user in this database — vendor case skipped)")
  check("none of the successful check-ins revoked a session", revokes() === before)

  section("Wrong portal → refused, session revoked, audited")
  as("ADMIN", "admin"); before = revokes(); let f0 = await failureCount(admin.id, "WRONG_PORTAL")
  r = await post({ portal: "client" })
  check("admin at the CLIENT sign-in → 403 WRONG_PORTAL", r.http === 403 && r.code === "WRONG_PORTAL", r)
  check("…the message points to the staff login", /staff login/i.test(r.error ?? "") && r.portal === "staff" && r.correctPath === "/staff-login", r)
  check("…the session was revoked", revokes() === before + 1)
  check("…a failed-LOGIN audit entry was written", (await failureCount(admin.id, "WRONG_PORTAL")) === f0 + 1)
  const row = await prisma.auditLog.findFirst({ where: { userId: admin.id, status: "FAILURE", metadata: { path: ["event"], equals: "WRONG_PORTAL" } }, orderBy: { sequence: "desc" } })
  check("…it says which role tried which portal, without naming the person", /ADMIN account attempted the client sign-in/.test(row?.description ?? "") && !(row?.description ?? "").includes(admin.fullName) && (row?.metadata as any)?.attemptedPortal === "client" && (row?.metadata as any)?.sessionRevoked === true, row)

  as("COORDINATOR", "coordinator"); before = revokes()
  r = await post({ portal: "client" })
  check("coordinator at the CLIENT sign-in → 403 and revoked", r.http === 403 && r.code === "WRONG_PORTAL" && revokes() === before + 1, r)
  if (vendor) { as("VENDOR", vendor.username!); before = revokes(); r = await post({ portal: "client" }); check("vendor at the CLIENT sign-in → 403 and revoked", r.http === 403 && revokes() === before + 1, r) }

  as("CLIENT", "client_anna"); before = revokes(); f0 = await failureCount(anna.id, "WRONG_PORTAL")
  r = await post({ portal: "staff" })
  check("client at the STAFF login → 403 WRONG_PORTAL", r.http === 403 && r.code === "WRONG_PORTAL" && r.portal === "client" && r.correctPath === "/sign-in", r)
  check("…the message points to the client sign-in", /client accounts sign in/i.test(r.error ?? ""))
  check("…revoked and audited", revokes() === before + 1 && (await failureCount(anna.id, "WRONG_PORTAL")) === f0 + 1)

  section("When Clerk cannot be reached")
  as("ADMIN", "admin", { TEST_REVOKE_FAIL: "1" }); f0 = await failureCount(admin.id, "WRONG_PORTAL")
  r = await post({ portal: "client" })
  check("revocation fails → the request is STILL refused (403)", r.http === 403 && r.code === "WRONG_PORTAL", r)
  const row2 = await prisma.auditLog.findFirst({ where: { userId: admin.id, status: "FAILURE", metadata: { path: ["event"], equals: "WRONG_PORTAL" } }, orderBy: { sequence: "desc" } })
  check("…and the audit entry honestly says the session was NOT revoked", (await failureCount(admin.id, "WRONG_PORTAL")) === f0 + 1 && (row2?.metadata as any)?.sessionRevoked === false && !/session revoked/.test(row2?.description ?? ""), row2?.description)

  section("Deactivated accounts and bad input")
  const ben = await prisma.user.findUnique({ where: { username: "client_ben" } })
  if (ben) {
    await prisma.user.update({ where: { id: ben.id }, data: { isActive: false } })
    try {
      as("CLIENT", "client_ben"); before = revokes(); const d0 = await failureCount(ben.id, "DEACTIVATED_SIGN_IN")
      r = await post({ portal: "client" })
      check("a deactivated client is refused even at the RIGHT portal (403 ACCOUNT_DEACTIVATED)", r.http === 403 && r.code === "ACCOUNT_DEACTIVATED", r)
      check("…session revoked and audited", revokes() === before + 1 && (await failureCount(ben.id, "DEACTIVATED_SIGN_IN")) === d0 + 1)
    } finally { await prisma.user.update({ where: { id: ben.id }, data: { isActive: true } }) }
  }
  as("ADMIN", "admin")
  check("missing/invalid portal → 422", (await post({ portal: "admin" })).http === 422 && (await post({})).http === 422 && (await post(undefined)).http === 422)
  as()
  check("no session → 401", (await post({ portal: "client" })).http === 401)

  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
