// prisma/verify-notifications.ts
/**
 * The notification/email primitives: notify(), notifyMany(), sendEmail()'s console fallback.
 *   npx tsx prisma/verify-notifications.ts
 */
import "dotenv/config"
import { sendEmail, _resetEmailTransportForTests } from "@/lib/email/send"
import { notify, notifyMany } from "@/lib/notifications/notify"
import { prisma } from "@/lib/prisma"

const TAG = "[test:notifications]"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log(`  ✅  ${n}`) } else { fails.push(n); console.log(`  ❌  ${n}${d !== undefined ? `\n        → ${JSON.stringify(d)}` : ""}`) } }
const section = (t: string) => console.log(`\n── ${t}`)

async function cleanup(userIds: string[]) { await prisma.notification.deleteMany({ where: { userId: { in: userIds } } }) }

async function main() {
  delete process.env.SMTP_HOST
  _resetEmailTransportForTests()

  section("sendEmail() — console fallback when SMTP is not configured (the default: dev + every test)")
  const r = await sendEmail({ to: "someone@example.com", subject: "Test", text: "Body" })
  check("returns sent:true via the console fallback, never throws", r.sent === true && r.mode === "console", r)

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  const client = await prisma.user.findFirst({ where: { role: "CLIENT" } })
  if (!admin || !client) throw new Error("Run the base seed first.")
  await cleanup([admin.id, client.id])

  section("notify() — writes an in-app row and never throws")
  await notify({ userId: admin.id, type: "PAYMENT_SUBMITTED", title: `${TAG} title`, body: "body text", link: "/x" })
  const row = await prisma.notification.findFirst({ where: { userId: admin.id, title: `${TAG} title` } })
  check("the notification was created, unread by default", !!row && row.isRead === false, row)
  check("the link is stored", row?.link === "/x")

  section("notify() never throws, even for a user with no email / a nonexistent user")
  let threw = false
  try { await notify({ userId: "does-not-exist", type: "PAYMENT_SUBMITTED", title: "x", body: "x" }) } catch { threw = true }
  check("a nonexistent recipient does not throw (best-effort, like logAction)", !threw)

  section("notifyMany() — one bad recipient never stops the others")
  const before = await prisma.notification.count({ where: { userId: admin.id } })
  await notifyMany(["does-not-exist", admin.id], { type: "PAYMENT_SUBMITTED", title: `${TAG} many`, body: "x" })
  check("the valid recipient still gets their notification", (await prisma.notification.count({ where: { userId: admin.id, title: `${TAG} many` } })) === 1)
  check("(and the count only grew by one, not by both attempts)", (await prisma.notification.count({ where: { userId: admin.id } })) === before + 1)

  await cleanup([admin.id, client.id])
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
