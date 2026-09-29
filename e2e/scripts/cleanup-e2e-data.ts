// e2e/scripts/cleanup-e2e-data.ts
//
// Removes the records the Playwright suite created on the live database — everything tagged with
// E2E_TAG (default "E2E-"): bookings (by venue), their payments, installments, vendor and staff
// assignments and notifications; vendors and packages whose name starts with the tag.
//
// Deliberately NOT removed (same rule as test-harness/integration/_support/cleanup.ts):
//   • Audit-log entries — the trail is an append-only hash chain; deleting rows would break it.
//   • User accounts — deleting a user would alter its audit rows. Test staff accounts ("e2e_…") are
//     DEACTIVATED instead. Remove test client sign-ups (…+clerk_test@…) in the Clerk dashboard if needed.
//   • Payment-proof images in Supabase Storage — delete the `<bookingId>/…` folders listed below by hand.
//
//   Dry run (default):  npx tsx e2e/scripts/cleanup-e2e-data.ts
//   Delete for real:    npx tsx e2e/scripts/cleanup-e2e-data.ts --apply
//
// Uses DATABASE_URL from .env (the production database when run against the live site). Read the dry-run
// output before using --apply.
import "dotenv/config"
import dotenv from "dotenv"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/app/generated/prisma/client"

dotenv.config({ path: "e2e/.env.e2e" })
const TAG = process.env.E2E_TAG || "E2E-"
const APPLY = process.argv.includes("--apply")
const url = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL (or DIRECT_URL) is not set.")
if (TAG.length < 3) throw new Error(`E2E_TAG "${TAG}" is too short to be safe.`)

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })

async function main() {
  const bookings = await db.booking.findMany({ where: { venue: { startsWith: TAG } }, select: { id: true, venue: true, status: true } })
  const bookingIds = bookings.map((b) => b.id)
  const payments = await db.payment.findMany({ where: { bookingId: { in: bookingIds } }, select: { id: true, proofStoragePath: true } })
  const vendors = await db.vendor.findMany({ where: { name: { startsWith: TAG } }, select: { id: true } })
  const packages = await db.package.findMany({ where: { name: { startsWith: TAG } }, select: { id: true } })
  const users = await db.user.findMany({ where: { username: { startsWith: "e2e_" }, isActive: true }, select: { id: true, username: true } })

  console.log(`Tag "${TAG}" — ${APPLY ? "DELETING" : "dry run (add --apply to delete)"}`)
  console.log(`  bookings: ${bookings.length}  payments: ${payments.length}  vendors: ${vendors.length}  packages: ${packages.length}`)
  console.log(`  active e2e_ staff accounts to deactivate: ${users.map((u) => u.username).join(", ") || "none"}`)
  const proofs = payments.map((p) => p.proofStoragePath).filter(Boolean)
  if (proofs.length) console.log(`  payment-proof files to delete by hand in Supabase Storage:\n    ${proofs.join("\n    ")}`)
  if (!APPLY) return

  const linkIds = [...bookingIds, ...payments.map((p) => p.id)]
  for (let i = 0; i < linkIds.length; i += 50) {
    await db.notification.deleteMany({ where: { OR: linkIds.slice(i, i + 50).map((id) => ({ link: { contains: id } })) } })
  }
  await db.payment.deleteMany({ where: { bookingId: { in: bookingIds } } })
  await db.installment.deleteMany({ where: { bookingId: { in: bookingIds } } })
  await db.bookingVendor.deleteMany({ where: { OR: [{ bookingId: { in: bookingIds } }, { vendor: { name: { startsWith: TAG } } }] } })
  await db.staffAssignment.deleteMany({ where: { bookingId: { in: bookingIds } } })
  await db.booking.deleteMany({ where: { id: { in: bookingIds } } })
  await db.vendor.deleteMany({ where: { name: { startsWith: TAG } } })
  await db.package.deleteMany({ where: { name: { startsWith: TAG }, bookings: { none: {} } } })
  await db.user.updateMany({ where: { id: { in: users.map((u) => u.id) } }, data: { isActive: false } })
  console.log("Done. Also deactivate the e2e_ accounts in Clerk (Users → ban) if they should not sign in again.")
}

main().finally(() => db.$disconnect())
