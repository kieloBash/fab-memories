// test-harness/integration/_support/cleanup.ts
//
// Removes everything the integration suite created (from THIS run and any earlier crashed run), using the database
// OWNER connection (TEST_DATABASE_URL) because the restricted app_runtime role may not delete.
//
// What is deliberately NOT removed:
//   • Audit-log entries. The trail is an append-only hash chain; deleting (or even SET NULL-ing) a row would break
//     verification. Test entries are ordinary, valid links in the chain.
//   • User accounts created by the staff-account / webhook suites (username or clerkId starting "itest"/"user_itest").
//     Deleting a user would SET NULL its audit rows' userId and break the chain, so they are left DEACTIVATED instead.
import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { TAG } from "./factories"

let owner: PrismaClient | null = null
function ownerDb() {
  return (owner ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL! }) }))
}

export async function cleanupTestData() {
  const db = ownerDb()
  const bookings = await db.booking.findMany({ where: { venue: { startsWith: TAG } }, select: { id: true } })
  const bookingIds = bookings.map((b) => b.id)
  const payments = await db.payment.findMany({ where: { bookingId: { in: bookingIds } }, select: { id: true } })
  const linkIds = [...bookingIds, ...payments.map((p) => p.id)]

  if (linkIds.length) {
    for (let i = 0; i < linkIds.length; i += 50) {
      await db.notification.deleteMany({ where: { OR: linkIds.slice(i, i + 50).map((id) => ({ link: { contains: id } })) } })
    }
  }
  await db.payment.deleteMany({ where: { bookingId: { in: bookingIds } } })
  await db.installment.deleteMany({ where: { bookingId: { in: bookingIds } } })
  await db.bookingVendor.deleteMany({ where: { OR: [{ bookingId: { in: bookingIds } }, { vendor: { name: { startsWith: TAG } } }] } })
  await db.staffAssignment.deleteMany({ where: { bookingId: { in: bookingIds } } })
  await db.booking.deleteMany({ where: { id: { in: bookingIds } } })
  await db.vendor.deleteMany({ where: { name: { startsWith: TAG } } })
  await db.package.deleteMany({ where: { name: { startsWith: TAG }, bookings: { none: {} } } })
  await db.coordinatorUnavailability.deleteMany({ where: { reason: { startsWith: "ITEST" } } })
  await db.user.updateMany({
    where: { OR: [{ username: { startsWith: "itest_" } }, { clerkId: { startsWith: "user_itest" } }] },
    data: { isActive: false },
  })
}

export async function disconnectOwner() {
  await owner?.$disconnect()
  owner = null
}
