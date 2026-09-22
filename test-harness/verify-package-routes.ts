// test-harness/verify-package-routes.ts
//
// PATCH /api/packages/[id] — edit + activate/deactivate stay TRUE partial updates.
import "dotenv/config"
import { PATCH as packagePATCH } from "@/app/api/packages/[packageId]/route"
import { prisma } from "@/lib/prisma"

const TAG = "[test:package-routes]"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log("  ✅ ", n) } else { fails.push(n); console.log("  ❌ ", n, d !== undefined ? "→ " + JSON.stringify(d) : "") } }
const as = (role?: string, user?: string) => { role ? (process.env.TEST_ROLE = role) : delete process.env.TEST_ROLE; user ? (process.env.TEST_USER = user) : delete process.env.TEST_USER }
const json = (body: unknown) => new Request("http://x", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
const P = (id: string) => ({ params: Promise.resolve({ packageId: id }) })
const body = async (r: Response) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }) as any

async function cleanup() { await prisma.package.deleteMany({ where: { name: { startsWith: TAG } } }) }

async function main() {
  await cleanup()
  as("ADMIN", "admin")
  const pkg = await prisma.package.create({ data: {
    name: `${TAG} Silver Package`, eventType: "BIRTHDAY", price: 20000, inclusions: ["Photobooth", "Emcee"], description: "A nice package.",
  } })

  let r = await body(await packagePATCH(json({ isActive: false }), P(pkg.id)))
  check("deactivating ONLY → 200, isActive false", r.status === 200 && r.isActive === false, r)
  check("…name, price and inclusions are untouched by the toggle", r.name === `${TAG} Silver Package` && Number(r.price) === 20000 && JSON.stringify(r.inclusions) === JSON.stringify(["Photobooth", "Emcee"]), r)

  r = await body(await packagePATCH(json({ price: 22000 }), P(pkg.id)))
  check("editing ONLY the price → 200, and isActive (just set to false) is NOT reset back to true", r.status === 200 && Number(r.price) === 22000 && r.isActive === false, r)

  r = await body(await packagePATCH(json({ isActive: true }), P(pkg.id)))
  check("reactivating → 200, price from the previous edit survives", r.status === 200 && r.isActive === true && Number(r.price) === 22000, r)

  as("COORDINATOR", "coordinator")
  r = await body(await packagePATCH(json({ price: 1 }), P(pkg.id)))
  check("a COORDINATOR cannot edit packages (403 — admin only)", r.status === 403, r)

  as("ADMIN", "admin")
  r = await body(await packagePATCH(json({ price: -5 }), P(pkg.id)))
  check("a non-positive price is rejected (422)", r.status === 422, r)
  r = await body(await packagePATCH(json({ name: 1 }), P("does-not-exist")))
  check("unknown package → 404", r.status === 404, r)

  await cleanup()
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) }).finally(() => prisma.$disconnect())
