import "dotenv/config"
import { GET as dashboardGET } from "@/app/api/reports/[type]/dashboard/route"
import { GET as bookingsGET } from "@/app/api/reports/[type]/bookings/route"
import { GET as paymentsGET } from "@/app/api/reports/[type]/payments/route"
import { GET as vendorsGET } from "@/app/api/reports/[type]/vendors/route"
import { GET as staffGET } from "@/app/api/reports/[type]/staff/route"
import { GET as auditGET } from "@/app/api/reports/[type]/audit/route"
import { GET as exportGET } from "@/app/api/reports/[type]/export/route"
import { manilaYmd } from "@/features/reports/reports.dates"
import { prisma } from "@/lib/prisma"

let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log("  ✅ ", n) } else { fails.push(n); console.log("  ❌ ", n, d !== undefined ? "→ " + (typeof d === "string" ? d : JSON.stringify(d)) : "") } }
const as = (role?: string, user?: string) => { role ? (process.env.TEST_ROLE = role) : delete process.env.TEST_ROLE; user ? (process.env.TEST_USER = user) : delete process.env.TEST_USER }
const url = (path: string, qs = "") => new Request(`http://localhost/api/reports/${path}${qs ? "?" + qs : ""}`)
const exp = (type: string, qs = "") => exportGET(url(`${type}/export`, qs), { params: Promise.resolve({ type }) })
const section = (t: string) => console.log(`\n── ${t}`)

const viewCount = async (userId: string, like: string) =>
  prisma.auditLog.count({ where: { userId, action: "VIEW", module: "REPORT", description: { contains: like } } })
const exportCount = async (userId: string) => prisma.auditLog.count({ where: { userId, action: "EXPORT", module: "REPORT" } })

async function main() {
  const admin = (await prisma.user.findUnique({ where: { username: "admin" } }))!
  const coord = (await prisma.user.findUnique({ where: { username: "coordinator" } }))!

  section("Authentication & role gating")
  as()
  check("no session → 401", (await bookingsGET(url("bookings"))).status === 401)
  as("CLIENT", "client_anna")
  for (const [n, h] of [["bookings", bookingsGET], ["payments", paymentsGET], ["vendors", vendorsGET], ["staff", staffGET], ["audit", auditGET]] as const)
    check(`CLIENT → 403 on ${n}`, (await h(url(n))).status === 403)
  check("CLIENT → 403 on dashboard", (await dashboardGET()).status === 403)
  check("CLIENT → 403 on export", (await exp("bookings")).status === 403)
  as("VENDOR", "vendor")
  check("VENDOR → 403 on bookings", (await bookingsGET(url("bookings"))).status === 403)
  as("COORDINATOR", "coordinator")
  for (const [n, h] of [["bookings", bookingsGET], ["payments", paymentsGET], ["vendors", vendorsGET], ["staff", staffGET]] as const)
    check(`COORDINATOR → 200 on ${n}`, (await h(url(n))).status === 200)
  check("COORDINATOR → 403 on audit report", (await auditGET(url("audit"))).status === 403)
  check("COORDINATOR → 403 on audit export", (await exp("audit")).status === 403)
  check("COORDINATOR → 403 on dashboard", (await dashboardGET()).status === 403)
  as("ADMIN", "admin")
  check("ADMIN → 200 on audit", (await auditGET(url("audit"))).status === 200)

  section("Deactivated accounts")
  await prisma.user.update({ where: { id: coord.id }, data: { isActive: false } })
  as("COORDINATOR", "coordinator")
  check("deactivated coordinator with a live session → 403", (await bookingsGET(url("bookings"))).status === 403)
  await prisma.user.update({ where: { id: coord.id }, data: { isActive: true } })

  section("Response shape & validation")
  as("ADMIN", "admin")
  const res = await bookingsGET(url("bookings", "bookingStatus=CONFIRMED&page=1&pageSize=5"))
  const body = await res.json()
  check("200 + Cache-Control: no-store", res.status === 200 && res.headers.get("cache-control") === "no-store")
  check("meta carries durationMs, totalRows, page info", typeof body.meta.durationMs === "number" && body.meta.pageSize === 5 && body.meta.totalRows >= body.rows.length, body.meta)
  check("filter respected", body.rows.every((r: any) => r.status === "CONFIRMED"))
  check("empty query values are ignored (bookingStatus=)", (await bookingsGET(url("bookings", "bookingStatus=&from="))).status === 200)
  const bad1 = await bookingsGET(url("bookings", "from=2026-10-02&to=2026-10-01"))
  check("from > to → 422 with a readable message", bad1.status === 422 && /from/.test((await bad1.json()).error))
  check("unknown enum → 422", (await bookingsGET(url("bookings", "bookingStatus=DONE"))).status === 422)
  check("pageSize=999 → 422", (await bookingsGET(url("bookings", "pageSize=999"))).status === 422)
  check("bad date format → 422", (await bookingsGET(url("bookings", "from=yesterday"))).status === 422)
  check("SQL-ish input is just an invalid value → 422", (await auditGET(url("audit", "module=BOOKING';DROP TABLE x;--"))).status === 422)
  const sr = await auditGET(url("audit", "search=%25%5C_'%22"))
  check("search with LIKE/quote metacharacters is safe → 200", sr.status === 200, sr.status)

  section("Audit logging of report views (FR-48) with de-duplication")
  const uniq = `2019-${String(1 + Math.floor(Math.random() * 12)).padStart(2, "0")}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, "0")}`  // unique per run
  const before = await viewCount(admin.id, "Payments & transactions report")
  await paymentsGET(url("payments", `paymentStatus=VERIFIED&from=${uniq}`))
  await paymentsGET(url("payments", `paymentStatus=VERIFIED&from=${uniq}`))
  await paymentsGET(url("payments", `paymentStatus=VERIFIED&from=${uniq}&page=2&pageSize=5`))
  check("same report + same filters (incl. paging) → one entry", (await viewCount(admin.id, "Payments & transactions report")) === before + 1)
  await paymentsGET(url("payments", `paymentStatus=FLAGGED&from=${uniq}`))
  check("different filters → a new entry", (await viewCount(admin.id, "Payments & transactions report")) === before + 2)
  const entry = await prisma.auditLog.findFirst({ where: { userId: admin.id, module: "REPORT", action: "VIEW", description: { contains: `paymentStatus FLAGGED` } }, orderBy: { sequence: "desc" } })
  check("entry records user, filters and timing", !!entry && (entry.metadata as any)?.report === "payments" && typeof (entry.metadata as any)?.durationMs === "number", entry?.metadata)

  const dBefore = await viewCount(admin.id, "operational dashboard")
  const d1 = await dashboardGET(); const dj = await d1.json()
  await dashboardGET(); await dashboardGET()
  check("dashboard → 200 with risks, recentAudit, riskSummary", d1.status === 200 && Array.isArray(dj.risks) && Array.isArray(dj.recentAudit) && dj.riskSummary.total >= 0)
  check("3 dashboard polls → at most one new audit entry (was one per poll)", (await viewCount(admin.id, "operational dashboard")) <= dBefore + 1)

  section("CSV export (FR-57)")
  const eBefore = await exportCount(admin.id)
  const e1 = await exp("bookings", "bookingStatus=CONFIRMED")
  const raw = new Uint8Array(await e1.arrayBuffer())        // text() would strip the BOM, so inspect raw bytes
  const csv = new TextDecoder("utf-8", { ignoreBOM: true }).decode(raw)
  const lines = csv.replace(/^\uFEFF/, "").trim().split("\n")
  const confirmed = await prisma.booking.count({ where: { status: "CONFIRMED" } })
  check("200, text/csv; charset=utf-8", e1.status === 200 && (e1.headers.get("content-type") ?? "").startsWith("text/csv; charset=utf-8"))
  check("attachment filename bookings-report-<today>.csv", e1.headers.get("content-disposition") === `attachment; filename="bookings-report-${manilaYmd()}.csv"`, e1.headers.get("content-disposition"))
  check("UTF-8 BOM + header row", raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf && lines[0].includes("Booking ID") && lines[0].includes("Agreed price (PHP)"))
  check("one row per matching booking (ignores paging)", lines.length - 1 === confirmed, { lines: lines.length - 1, confirmed })
  check("export writes an EXPORT/REPORT audit entry", (await exportCount(admin.id)) === eBefore + 1)
  await exp("bookings", "bookingStatus=CONFIRMED")
  check("every export is logged (no de-dup)", (await exportCount(admin.id)) === eBefore + 2)
  const eEntry = await prisma.auditLog.findFirst({ where: { userId: admin.id, action: "EXPORT" }, orderBy: { sequence: "desc" } })
  check("export entry records rowCount + filters", (eEntry!.metadata as any).rowCount === confirmed && (eEntry!.metadata as any).filters.bookingStatus === "CONFIRMED", eEntry!.metadata)

  const eo = await exp("payments", "table=outstanding")
  const oc = await eo.text()
  check("payments?table=outstanding → outstanding-balance CSV", eo.status === 200 && oc.split("\n")[0].includes("Outstanding (PHP)") && /payments-outstanding-report-/.test(eo.headers.get("content-disposition")!))
  check("vendors?table=gaps → 200", (await exp("vendors", "table=gaps")).status === 200)
  check("staff?table=coordinators → 200", (await exp("staff", "table=coordinators")).status === 200)
  const ea = await exp("audit"); const at = await ea.text()
  check("audit export carries sequence + hash columns", ea.status === 200 && at.split("\n")[0].includes("Entry hash (SHA-256)") && at.includes("GENESIS"))
  check("unknown table → 404", (await exp("bookings", "table=nope")).status === 404)
  check("unknown report → 404", (await exp("secrets")).status === 404)
  check("format=pdf → 422 (CSV only)", (await exp("bookings", "format=pdf")).status === 422)
  check("export honours validation (from > to → 422)", (await exp("bookings", "from=2026-10-02&to=2026-10-01")).status === 422)

  section("CSV formula injection, end to end")
  const client = (await prisma.user.findFirst({ where: { role: "CLIENT" } }))!
  const pkg = (await prisma.package.findFirst())!
  const evil = await prisma.booking.create({ data: { clientId: client.id, packageId: pkg.id, eventType: "OTHER", eventDate: new Date("2030-01-01"), venue: "=HYPERLINK(\"http://evil\",\"x\")", guestCount: 1, clientPhone: "0", agreedPrice: 1, status: "PENDING", staffNote: "[seed:reports] TMP-evil" } })
  try {
    const ec = await (await exp("bookings", "from=2030-01-01&to=2030-01-01")).text()
    check("hostile venue text is neutralised in the CSV", ec.includes("'=HYPERLINK") && !/(^|,)=HYPERLINK/.test(ec), ec.split("\n")[1])
  } finally { await prisma.booking.delete({ where: { id: evil.id } }) }

  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
