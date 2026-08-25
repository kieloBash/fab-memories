// prisma/seed.ts
/**
 * Seeds Modules 1, 2 & 3 (corrected payment flow):
 *
 *   Users    : ADMIN, COORDINATOR, VENDOR, CLIENT ×2
 *   Packages : Wedding ×2, Debut ×1, Corporate ×1, Birthday ×1
 *   Bookings :
 *     - Anna / Debut   → CONFIRMED (deposit verified by coordinator)
 *     - Ben  / Corp    → PENDING   (deposit SUBMITTED, awaiting verification)
 *     - Anna / Wedding → PENDING   (no deposit yet)
 *     - Ben  / Birthday→ PENDING
 *     - Anna / Wedding → CANCELLED
 *
 *   Payments :
 *     - Anna Debut  : deposit VERIFIED → booking CONFIRMED
 *     - Anna Debut  : installment #1 VERIFIED (PAID)
 *     - Anna Debut  : installment #2 SUBMITTED (awaiting verification)
 *     - Ben  Corp   : deposit SUBMITTED (awaiting verification)
 *
 *   Installments (Anna Debut) :
 *     - #1 PAID     (linked to verified installment payment)
 *     - #2 UNPAID   overdue  (pending — payment submitted)
 *     - #3 UNPAID   future
 *
 * Safe to re-run — full Clerk + Prisma cleanup first.
 */

import {
  PrismaClient,
  Role,
  EventType,
  BookingStatus,
  PaymentMethod,
  PaymentType,
  PaymentStatus,
  InstallmentStatus,
} from "@/app/generated/prisma/client"
import { createClerkClient } from "@clerk/backend"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"

// ── Clients ───────────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma  = new PrismaClient({ adapter })
const clerk   = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

// ── Helpers ───────────────────────────────────────────────────

function futureDate(days: number): Date {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setDate(d.getDate() + days); return d
}
function pastDate(days: number): Date {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setDate(d.getDate() - days); return d
}

async function cleanupClerkUser(email: string, clerkId?: string) {
  if (clerkId) {
    try { await clerk.users.deleteUser(clerkId); console.log(`    🗑  Clerk ${clerkId}`) } catch {}
  }
  try {
    const r = await clerk.users.getUserList({ emailAddress: [email], limit: 1 })
    if (r.data.length) { await clerk.users.deleteUser(r.data[0].id); console.log(`    🗑  Clerk (orphan) ${email}`) }
  } catch {}
}

async function cleanupUser(u: { username: string; email: string }) {
  console.log(`  🔍  "${u.username}"`)
  const existing = await prisma.user.findUnique({ where: { username: u.username } })
  if (existing) {
    await cleanupClerkUser(u.email, existing.clerkId)
    await prisma.user.delete({ where: { id: existing.id } })
    console.log(`    🗑  Prisma user ${existing.id}`)
  } else {
    await cleanupClerkUser(u.email)
  }
}

async function createUser(u: {
  username: string; password: string; fullName: string; email: string; role: Role
}): Promise<string> {
  const isStaff = u.role !== Role.CLIENT
  const clerkUser = await clerk.users.createUser({
    username: u.username,
    password: u.password,
    emailAddress: [isStaff ? `seed.${u.username}@example.com` : u.email],
    publicMetadata: { role: u.role },
    skipPasswordChecks: false,
  })
  const db = await prisma.user.create({
    data: { clerkId: clerkUser.id, username: u.username, fullName: u.fullName, email: isStaff ? null : u.email, role: u.role },
  })
  console.log(`  ✅  ${u.role.padEnd(11)} "${u.username}"  clerkId=${clerkUser.id}`)
  return db.id
}

// ── Seed definitions ──────────────────────────────────────────

const USERS = [
  { username: process.env.SEED_ADMIN_USERNAME ?? "admin",       password: process.env.SEED_ADMIN_PASSWORD ?? "FabMemories123!", fullName: process.env.SEED_ADMIN_FULLNAME ?? "System Administrator", email: process.env.SEED_ADMIN_EMAIL ?? "admin.fabmemories@example.com",       role: Role.ADMIN },
  { username: "coordinator", password: "FabMemories123!", fullName: "Maria Santos",   email: "coordinator.fabmemories@example.com", role: Role.COORDINATOR },
  { username: "vendor",      password: "FabMemories123!", fullName: "Juan dela Cruz", email: "vendor.fabmemories@example.com",      role: Role.VENDOR },
  { username: "client_anna", password: "FabMemories123!", fullName: "Anna Reyes",     email: "anna.fabmemories@example.com",        role: Role.CLIENT },
  { username: "client_ben",  password: "FabMemories123!", fullName: "Ben Torres",     email: "ben.fabmemories@example.com",         role: Role.CLIENT },
]

const PACKAGES = [
  { name: "Classic Wedding Package",   eventType: EventType.WEDDING,   price: 85000,  description: "Elegant, all-inclusive wedding for intimate ceremonies.",               inclusions: ["8-hour coverage", "Bridal car decoration", "Floral centerpieces (10 tables)", "Wedding cake (3 tiers)", "Sound system & emcee", "Photo & video coverage", "Coordinator on-site"] },
  { name: "Grand Wedding Package",     eventType: EventType.WEDDING,   price: 150000, description: "Full-scale wedding production with premium add-ons.",                   inclusions: ["12-hour coverage", "Bridal car decoration", "Floral arch & centerpieces (20 tables)", "Premium wedding cake (5 tiers)", "Full band & emcee", "Cinematic photo & video", "Drone shots", "Pre-nuptial shoot", "Two coordinators"] },
  { name: "Elegant Debut Package",     eventType: EventType.DEBUT,     price: 65000,  description: "Memorable 18th birthday celebration for the debutante.",                inclusions: ["8-hour coverage", "18 roses & 18 candles ceremony", "Gown styling assistance", "Floral centerpieces (8 tables)", "Debut cake (3 tiers)", "DJ & sound system", "Photo & video coverage", "Coordinator on-site"] },
  { name: "Corporate Events Package",  eventType: EventType.CORPORATE, price: 50000,  description: "Professional event management for launches, conferences, and galas.",   inclusions: ["6-hour coverage", "Corporate backdrop & branding", "LED screen & projector", "Sound system & microphones", "Professional emcee", "Event documentation (photo)", "Coordinator on-site"] },
  { name: "Birthday Celebration Package", eventType: EventType.BIRTHDAY, price: 30000, description: "Fun and festive birthday party setup for all ages.",                  inclusions: ["5-hour coverage", "Themed balloon decorations", "Birthday cake (2 tiers)", "Photo booth with props", "DJ & sound system", "Coordinator on-site"] },
]

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱  Starting seed (Modules 1, 2 & 3 — corrected payment flow)…")

  if (!process.env.CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY is required.")
  if (!process.env.DATABASE_URL)     throw new Error("DATABASE_URL is required.")

  // ── Cleanup (order: installments → payments → bookings → packages → users)
  console.log("\n🧹  Cleaning up…")
  await prisma.installment.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.auditLog.deleteMany()

  // ── Users ──────────────────────────────────────────────────
  console.log("\n👤  Seeding users…\n")
  for (const u of USERS) await cleanupUser(u)
  console.log()
  const ids: Record<string, string> = {}
  for (const u of USERS) ids[u.username] = await createUser(u)

  // ── Packages ───────────────────────────────────────────────
  console.log("\n📦  Seeding packages…\n")
  await prisma.package.deleteMany()
  console.log("  🗑  Cleared packages")
  const pkgMap: Record<string, string> = {}
  for (const p of PACKAGES) {
    const created = await prisma.package.create({ data: p })
    console.log(`  ✅  ${p.eventType.padEnd(11)} "${p.name}"`)
    if (!pkgMap[p.eventType]) pkgMap[p.eventType] = created.id
  }

  // ── Bookings ───────────────────────────────────────────────
  console.log("\n📅  Seeding bookings…\n")

  // Anna — Debut CONFIRMED (deposit will be verified below)
  const annaDebut = await prisma.booking.create({
    data: {
      clientId:  ids["client_anna"],
      packageId: pkgMap[EventType.DEBUT],
      eventType: EventType.DEBUT,
      eventDate: futureDate(45),
      venue:     "Waterfront Hotel, Lahug, Cebu City",
      guestCount: 200,
      status:    BookingStatus.PENDING, // will flip to CONFIRMED via deposit verification below
      notes:     "Gold and white color motif.",
    },
  })
  console.log(`  ✅  PENDING (will confirm)  | Anna | Debut    +45d  id=${annaDebut.id}`)

  // Ben — Corporate PENDING deposit submitted
  const benCorp = await prisma.booking.create({
    data: {
      clientId:  ids["client_ben"],
      packageId: pkgMap[EventType.CORPORATE],
      eventType: EventType.CORPORATE,
      eventDate: futureDate(60),
      venue:     "Radisson Blu, Cebu City",
      guestCount: 300,
      status:    BookingStatus.PENDING,
    },
  })
  console.log(`  ✅  PENDING                | Ben  | Corporate +60d id=${benCorp.id}`)

  // Additional bookings (pure PENDING, no payments)
  await prisma.booking.create({
    data: { clientId: ids["client_anna"], packageId: pkgMap[EventType.WEDDING], eventType: EventType.WEDDING, eventDate: futureDate(90), venue: "The Ruins, Talisay City", guestCount: 120, status: BookingStatus.PENDING, notes: "Please arrange string quartet." },
  })
  await prisma.booking.create({
    data: { clientId: ids["client_ben"], packageId: pkgMap[EventType.BIRTHDAY], eventType: EventType.BIRTHDAY, eventDate: futureDate(14), venue: "Balay ni Atong, Cebu City", guestCount: 60, status: BookingStatus.PENDING, notes: "Dinosaur theme." },
  })
  await prisma.booking.create({
    data: { clientId: ids["client_anna"], packageId: pkgMap[EventType.WEDDING], eventType: EventType.WEDDING, eventDate: pastDate(10), venue: "Plantation Bay Resort, Mactan", guestCount: 80, status: BookingStatus.CANCELLED, cancellationReason: "Client requested cancellation due to venue conflict." },
  })
  console.log(`  ✅  3 more bookings created (PENDING ×2, CANCELLED ×1)`)

  // ── Payments & confirmation flow ───────────────────────────
  console.log("\n💳  Seeding payments & installments…\n")

  const DEBUT_PRICE = 65000

  // ── Anna Debut — deposit VERIFIED → booking CONFIRMED ──────
  const annaDeposit = await prisma.payment.create({
    data: {
      bookingId:       annaDebut.id,
      paymentType:     PaymentType.DEPOSIT,
      method:          PaymentMethod.GCASH,
      status:          PaymentStatus.VERIFIED,
      amount:          19500,             // 30% of 65000
      referenceNumber: "GC-20250001",
      submittedAt:     pastDate(20),
      verifiedById:    ids["coordinator"],
      verifiedAt:      pastDate(19),
      verificationNote: "Deposit confirmed. Booking is now active.",
    },
  })
  // Simulate the Prisma transaction: flip booking to CONFIRMED
  await prisma.booking.update({
    where: { id: annaDebut.id },
    data: {
      status:              BookingStatus.CONFIRMED,
      depositVerifiedAt:   pastDate(19),
      depositVerifiedById: ids["coordinator"],
    },
  })
  console.log(`  ✅  DEPOSIT VERIFIED  | Anna | GCash GC-20250001 → Debut booking CONFIRMED`)

  // ── Admin creates installment schedule (3 installments per contract) ──
  const installments = await Promise.all([
    prisma.installment.create({
      data: { bookingId: annaDebut.id, order: 1, dueDate: pastDate(45), amount: 19500, status: InstallmentStatus.PAID, paidAt: pastDate(10), note: "1st installment per contract" },
    }),
    prisma.installment.create({
      data: { bookingId: annaDebut.id, order: 2, dueDate: pastDate(5), amount: 13000, status: InstallmentStatus.UNPAID, note: "2nd installment per contract" },
    }),
    prisma.installment.create({
      data: { bookingId: annaDebut.id, order: 3, dueDate: futureDate(25), amount: 13000, status: InstallmentStatus.UNPAID, note: "Final installment per contract" },
    }),
  ])
  console.log(`  ✅  3 installments created (₱19,500 + ₱13,000 + ₱13,000 = ₱45,500 remaining)`)

  // ── Installment #1 — VERIFIED payment (PAID) ───────────────
  const inst1Payment = await prisma.payment.create({
    data: {
      bookingId:       annaDebut.id,
      paymentType:     PaymentType.INSTALLMENT,
      method:          PaymentMethod.BANK_TRANSFER,
      status:          PaymentStatus.VERIFIED,
      amount:          19500,
      referenceNumber: "BT-20250010",
      submittedAt:     pastDate(11),
      verifiedById:    ids["coordinator"],
      verifiedAt:      pastDate(10),
      verificationNote: "Bank transfer confirmed.",
    },
  })
  // Link payment to installment #1 and mark it PAID
  await prisma.installment.update({
    where: { id: installments[0].id },
    data:  { paymentId: inst1Payment.id },
  })
  console.log(`  ✅  INSTALLMENT #1 VERIFIED  | Anna | Bank BT-20250010 → #1 PAID`)

  // ── Installment #2 — SUBMITTED (awaiting verification) ─────
  const inst2Payment = await prisma.payment.create({
    data: {
      bookingId:       annaDebut.id,
      paymentType:     PaymentType.INSTALLMENT,
      method:          PaymentMethod.GCASH,
      status:          PaymentStatus.SUBMITTED,
      amount:          13000,
      referenceNumber: "GC-20250055",
      submittedAt:     pastDate(1),
    },
  })
  console.log(`  ✅  INSTALLMENT #2 SUBMITTED | Anna | GCash GC-20250055 (awaiting verification)`)

  // ── Ben Corp — deposit SUBMITTED (pending verification) ─────
  await prisma.payment.create({
    data: {
      bookingId:       benCorp.id,
      paymentType:     PaymentType.DEPOSIT,
      method:          PaymentMethod.MAYA,
      status:          PaymentStatus.SUBMITTED,
      amount:          15000,             // 30% of 50000
      referenceNumber: "MY-20250007",
      submittedAt:     new Date(),
    },
  })
  console.log(`  ✅  DEPOSIT SUBMITTED | Ben  | Maya MY-20250007 (awaiting verification)`)

  // ── Summary ───────────────────────────────────────────────
  console.log("\n✨  Seed complete!\n")
  console.log("  ┌──────────────────────────────────────────────────────────────────────────────┐")
  console.log("  │  Staff accounts — login at /staff-login                                      │")
  console.log("  ├─────────────┬─────────────┬──────────────────┬──────────────────────────────┤")
  console.log("  │ Role        │ Username    │ Password         │ Full Name                    │")
  console.log("  ├─────────────┼─────────────┼──────────────────┼──────────────────────────────┤")
  console.log("  │ ADMIN       │ admin       │ FabMemories123!  │ System Administrator         │")
  console.log("  │ COORDINATOR │ coordinator │ FabMemories123!  │ Maria Santos                 │")
  console.log("  │ VENDOR      │ vendor      │ FabMemories123!  │ Juan dela Cruz               │")
  console.log("  ├─────────────┴─────────────┴──────────────────┴──────────────────────────────┤")
  console.log("  │  Client accounts — login at /sign-in (by email)                             │")
  console.log("  ├──────────────┬────────────────────────────────────┬────────────────────────┤")
  console.log("  │ Name         │ Email                              │ Password               │")
  console.log("  ├──────────────┼────────────────────────────────────┼────────────────────────┤")
  console.log("  │ Anna Reyes   │ anna.fabmemories@example.com       │ FabMemories123!        │")
  console.log("  │ Ben Torres   │ ben.fabmemories@example.com        │ FabMemories123!        │")
  console.log("  └──────────────┴────────────────────────────────────┴────────────────────────┘\n")
  console.log("  Packages     : 5  (Wedding×2, Debut×1, Corporate×1, Birthday×1)")
  console.log("  Bookings     : 5  (CONFIRMED×1, PENDING×3, CANCELLED×1)")
  console.log("  Payments     : 4")
  console.log("    • Anna Debut deposit    → VERIFIED  (booking now CONFIRMED)")
  console.log("    • Anna Installment #1   → VERIFIED  (installment #1 PAID)")
  console.log("    • Anna Installment #2   → SUBMITTED (awaiting staff verification)")
  console.log("    • Ben Corp deposit      → SUBMITTED (awaiting staff verification)")
  console.log("  Installments : 3  (PAID×1, UNPAID overdue×1, UNPAID future×1)\n")
  console.log("  ⚠️  Change all passwords after first login.")
  console.log("  ⚠️  Never commit seed passwords to source control.\n")
}

main()
  .catch((err) => { console.error("\n❌  Seed failed:", err); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
