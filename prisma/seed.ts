// prisma/seed.ts
/**
 * Seeds the database with test data for Modules 1, 2 & 3
 * (corrected payment flow + agreedPrice fix):
 *
 *   Users    : ADMIN, COORDINATOR, VENDOR, CLIENT ×2
 *
 *   Packages : Wedding ×2, Debut ×1, Corporate ×1, Birthday ×1
 *              All packages have priceProvincial set (+15% of standard)
 *
 *   Bookings (5 total):
 *     - Anna / Debut    → CONFIRMED (deposit verified, provincial rate)
 *     - Ben  / Corp     → PENDING   (deposit SUBMITTED, metro rate)
 *     - Anna / Wedding  → PENDING   (no deposit, metro rate)
 *     - Ben  / Birthday → PENDING   (no deposit, provincial rate)
 *     - Anna / Wedding  → CANCELLED
 *
 *   Payments:
 *     - Anna Debut  deposit   → VERIFIED  (triggers CONFIRMED + isProvincial)
 *     - Anna Debut  install#1 → VERIFIED  (PAID)
 *     - Anna Debut  install#2 → SUBMITTED (awaiting)
 *     - Ben  Corp   deposit   → SUBMITTED (awaiting, metro rate)
 *
 *   Installments (Anna Debut — 3 per contract):
 *     - #1 PAID     (linked to verified payment)
 *     - #2 UNPAID   overdue
 *     - #3 UNPAID   future
 *
 * Safe to re-run — full Clerk + Prisma cleanup first.
 *
 * Usage:
 *   npx prisma db seed
 *
 * Required env vars:
 *   CLERK_SECRET_KEY
 *   DATABASE_URL
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

// ── Client setup ──────────────────────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

// ── Helpers ───────────────────────────────────────────────────────────────────

function futureDate(days: number): Date {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setDate(d.getDate() + days); return d
}
function pastDate(days: number): Date {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setDate(d.getDate() - days); return d
}

async function cleanupClerkUser(email: string, clerkId?: string) {
  if (clerkId) {
    try {
      await clerk.users.deleteUser(clerkId)
      console.log(`    🗑  Clerk clerkId=${clerkId}`)
      return
    } catch { }
  }
  try {
    const r = await clerk.users.getUserList({ emailAddress: [email], limit: 1 })
    if (r.data.length) {
      await clerk.users.deleteUser(r.data[0].id)
      console.log(`    🗑  Clerk orphan email=${email}`)
    }
  } catch { }
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
    data: {
      clerkId: clerkUser.id,
      username: u.username,
      fullName: u.fullName,
      email: isStaff ? null : u.email,
      role: u.role,
    },
  })
  console.log(`  ✅  ${u.role.padEnd(11)} "${u.username}"  clerkId=${clerkUser.id}`)
  return db.id
}

// ── Users ─────────────────────────────────────────────────────────────────────

const USERS = [
  {
    username: process.env.SEED_ADMIN_USERNAME ?? "admin",
    password: process.env.SEED_ADMIN_PASSWORD ?? "FabMemories123!",
    fullName: process.env.SEED_ADMIN_FULLNAME ?? "System Administrator",
    email: process.env.SEED_ADMIN_EMAIL ?? "admin.fabmemories@example.com",
    role: Role.ADMIN,
  },
  { username: "coordinator", password: "FabMemories123!", fullName: "Maria Santos", email: "coordinator.fabmemories@example.com", role: Role.COORDINATOR },
  { username: "vendor", password: "FabMemories123!", fullName: "Juan dela Cruz", email: "vendor.fabmemories@example.com", role: Role.VENDOR },
  { username: "client_anna", password: "FabMemories123!", fullName: "Anna Reyes", email: "anna.fabmemories@example.com", role: Role.CLIENT },
  { username: "client_ben", password: "FabMemories123!", fullName: "Ben Torres", email: "ben.fabmemories@example.com", role: Role.CLIENT },
]

// ── Packages ──────────────────────────────────────────────────────────────────
// priceProvincial = standard price + 15% (rounded to nearest 500)

const PACKAGES = [
  {
    name: "Classic Wedding Package",
    description: "An elegant, all-inclusive wedding package perfect for intimate ceremonies.",
    eventType: EventType.WEDDING,
    price: 85000,
    priceProvincial: 97750,  // 85000 * 1.15 ≈ 97750
    inclusions: [
      "8-hour event coverage",
      "Bridal car decoration",
      "Floral centerpieces (10 tables)",
      "Wedding cake (3 tiers)",
      "Sound system & emcee",
      "Photo & video coverage",
      "Coordinator on-site",
    ],
  },
  {
    name: "Grand Wedding Package",
    description: "Full-scale wedding production for larger celebrations with premium add-ons.",
    eventType: EventType.WEDDING,
    price: 150000,
    priceProvincial: 172500, // 150000 * 1.15
    inclusions: [
      "12-hour event coverage",
      "Bridal car decoration",
      "Floral arch & centerpieces (20 tables)",
      "Premium wedding cake (5 tiers)",
      "Full band & professional emcee",
      "Cinematic photo & video coverage",
      "Drone aerial shots",
      "Pre-nuptial shoot (1 day)",
      "Two coordinators on-site",
    ],
  },
  {
    name: "Elegant Debut Package",
    description: "A memorable 18th birthday celebration tailored for the debutante.",
    eventType: EventType.DEBUT,
    price: 65000,
    priceProvincial: 74750,  // 65000 * 1.15 ≈ 74750
    inclusions: [
      "8-hour event coverage",
      "18 roses & 18 candles ceremony",
      "Debut gown styling assistance",
      "Floral centerpieces (8 tables)",
      "Debut cake (3 tiers)",
      "DJ & sound system",
      "Photo & video coverage",
      "Coordinator on-site",
    ],
  },
  {
    name: "Corporate Events Package",
    description: "Professional event management for product launches, conferences, and galas.",
    eventType: EventType.CORPORATE,
    price: 50000,
    priceProvincial: 57500,  // 50000 * 1.15
    inclusions: [
      "6-hour event coverage",
      "Corporate backdrop & branding setup",
      "LED screen & projector",
      "Sound system & microphones",
      "Professional emcee",
      "Event documentation (photo)",
      "Coordinator on-site",
    ],
  },
  {
    name: "Birthday Celebration Package",
    description: "Fun and festive birthday party setup for all ages.",
    eventType: EventType.BIRTHDAY,
    price: 30000,
    priceProvincial: 34500,  // 30000 * 1.15
    inclusions: [
      "5-hour event coverage",
      "Themed balloon decorations",
      "Birthday cake (2 tiers)",
      "Photo booth with props",
      "DJ & sound system",
      "Coordinator on-site",
    ],
  },
]

async function seedPackages(): Promise<Record<string, string>> {
  console.log("\n📦  Seeding packages…\n")
  await prisma.package.deleteMany()
  console.log("  🗑  Cleared packages")

  const idMap: Record<string, string> = {}
  for (const p of PACKAGES) {
    const created = await prisma.package.create({
      data: {
        name: p.name,
        description: p.description,
        eventType: p.eventType,
        price: p.price,
        priceProvincial: p.priceProvincial,
        inclusions: p.inclusions,
      },
    })
    console.log(`  ✅  ${p.eventType.padEnd(11)} "${p.name}"  std=₱${p.price.toLocaleString()}  prov=₱${p.priceProvincial.toLocaleString()}`)
    if (!idMap[p.eventType]) idMap[p.eventType] = created.id
  }
  return idMap
}

// ── Bookings, Payments & Installments ────────────────────────────────────────

async function seedBookingsAndPayments(
  pkgIds: Record<string, string>,
  userIds: { admin: string; coordinator: string; anna: string; ben: string },
): Promise<void> {
  console.log("\n📅  Seeding bookings, payments & installments…\n")

  // Clear in FK-safe order
  await prisma.installment.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.booking.deleteMany()
  console.log("  🗑  Cleared bookings, payments, installments\n")

  // ── 1. Anna — Debut CONFIRMED (provincial, deposit verified) ──────────────
  // Debut provincial price: ₱74,750 (65000 * 1.15)
  const DEBUT_AGREED = 74750

  const annaDebut = await prisma.booking.create({
    data: {
      clientId: userIds.anna,
      packageId: pkgIds[EventType.DEBUT],
      eventType: EventType.DEBUT,
      eventDate: futureDate(45),
      venue: "Waterfront Hotel, Lahug, Cebu City",
      // Cebu = provincial
      venueLatitude: 10.3157,
      venueLongitude: 123.8854,
      venueFormattedAddress: "Waterfront Cebu City Hotel & Casino, 1 Salinas Dr, Lahug, Cebu City, 6000 Cebu, Philippines",
      guestCount: 200,
      isProvincial: true,
      agreedPrice: DEBUT_AGREED,
      status: BookingStatus.CONFIRMED,
      depositVerifiedAt: new Date(),
      depositVerifiedById: userIds.coordinator,
      notes: "Gold and white color motif.",
    },
  })
  console.log(`  ✅  CONFIRMED | Anna | Debut +45d   | provincial ₱${DEBUT_AGREED.toLocaleString()}  id=${annaDebut.id}`)

  // Deposit: 30% of agreed price = ₱22,425
  const DEBUT_DEPOSIT = Math.round(DEBUT_AGREED * 0.3)
  const annaDeposit = await prisma.payment.create({
    data: {
      bookingId: annaDebut.id,
      paymentType: PaymentType.DEPOSIT,
      method: PaymentMethod.GCASH,
      status: PaymentStatus.VERIFIED,
      amount: DEBUT_DEPOSIT,
      referenceNumber: "GC-20250001",
      submittedAt: pastDate(20),
      verifiedById: userIds.coordinator,
      verifiedAt: pastDate(19),
      verificationNote: "Deposit confirmed. Booking is now active.",
    },
  })
  console.log(`  ✅  DEPOSIT VERIFIED   | Anna | GCash GC-20250001  ₱${DEBUT_DEPOSIT.toLocaleString()}`)

  // Installment schedule: 3 installments covering ₱74,750 − ₱22,425 = ₱52,325
  const DEBUT_REMAINING = DEBUT_AGREED - DEBUT_DEPOSIT // 52325
  const INST_1 = Math.round(DEBUT_REMAINING / 3)          // ~17442
  const INST_2 = Math.round(DEBUT_REMAINING / 3)
  const INST_3 = DEBUT_REMAINING - INST_1 - INST_2        // absorbs rounding

  const inst1 = await prisma.installment.create({
    data: {
      bookingId: annaDebut.id, order: 1,
      dueDate: pastDate(45), amount: INST_1,
      status: InstallmentStatus.PAID,
      paidAt: pastDate(10),
      note: "1st installment per contract",
    },
  })
  const inst2 = await prisma.installment.create({
    data: {
      bookingId: annaDebut.id, order: 2,
      dueDate: pastDate(5), amount: INST_2,
      status: InstallmentStatus.UNPAID,
      note: "2nd installment per contract",
    },
  })
  await prisma.installment.create({
    data: {
      bookingId: annaDebut.id, order: 3,
      dueDate: futureDate(25), amount: INST_3,
      status: InstallmentStatus.UNPAID,
      note: "Final installment per contract",
    },
  })
  console.log(`  ✅  3 installments: ₱${INST_1.toLocaleString()} + ₱${INST_2.toLocaleString()} + ₱${INST_3.toLocaleString()} = ₱${DEBUT_REMAINING.toLocaleString()}`)

  // Installment #1 — VERIFIED (PAID)
  await prisma.payment.create({
    data: {
      bookingId: annaDebut.id,
      paymentType: PaymentType.INSTALLMENT,
      method: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.VERIFIED,
      amount: INST_1,
      referenceNumber: "BT-20250010",
      submittedAt: pastDate(11),
      verifiedById: userIds.coordinator,
      verifiedAt: pastDate(10),
      verificationNote: "Bank transfer confirmed.",
      installmentId: inst1.id,
    },
  })
  await prisma.installment.update({
    where: { id: inst1.id },
    data: { status: InstallmentStatus.PAID, paidAt: pastDate(10) },
  })
  console.log(`  ✅  INSTALLMENT #1 VERIFIED  | Anna | Bank BT-20250010  ₱${INST_1.toLocaleString()}`)

  // Installment #2 — SUBMITTED (awaiting verification)
  await prisma.payment.create({
    data: {
      bookingId: annaDebut.id,
      paymentType: PaymentType.INSTALLMENT,
      method: PaymentMethod.GCASH,
      status: PaymentStatus.SUBMITTED,
      amount: INST_2,
      referenceNumber: "GC-20250055",
      submittedAt: pastDate(1),
      installmentId: inst2.id,
    },
  })
  console.log(`  ✅  INSTALLMENT #2 SUBMITTED | Anna | GCash GC-20250055  ₱${INST_2.toLocaleString()} (awaiting)`)

  // ── 2. Ben — Corporate PENDING (metro rate, deposit submitted) ────────────
  const CORP_AGREED = 50000 // metro rate (standard)

  const benCorp = await prisma.booking.create({
    data: {
      clientId: userIds.ben,
      packageId: pkgIds[EventType.CORPORATE],
      eventType: EventType.CORPORATE,
      eventDate: futureDate(60),
      venue: "Radisson Blu Hotel, Atria Park, Gen. Douglas MacArthur Ave, Cebu City",
      venueLatitude: 10.3236,
      venueLongitude: 123.9014,
      venueFormattedAddress: "Radisson Blu Cebu, Cebu City, Philippines",
      guestCount: 300,
      isProvincial: false, // manually set to metro for test variety
      agreedPrice: CORP_AGREED,
      status: BookingStatus.PENDING,
    },
  })
  console.log(`  ✅  PENDING   | Ben  | Corporate +60d | metro ₱${CORP_AGREED.toLocaleString()}  id=${benCorp.id}`)

  const CORP_DEPOSIT = Math.round(CORP_AGREED * 0.3) // 15000
  await prisma.payment.create({
    data: {
      bookingId: benCorp.id,
      paymentType: PaymentType.DEPOSIT,
      method: PaymentMethod.MAYA,
      status: PaymentStatus.SUBMITTED,
      amount: CORP_DEPOSIT,
      referenceNumber: "MY-20250007",
      submittedAt: new Date(),
    },
  })
  console.log(`  ✅  DEPOSIT SUBMITTED  | Ben  | Maya MY-20250007  ₱${CORP_DEPOSIT.toLocaleString()} (awaiting)`)

  // ── 3. Anna — Wedding PENDING (metro, no deposit yet) ─────────────────────
  const WEDDING_AGREED = 85000 // classic wedding, metro

  const annaWedding = await prisma.booking.create({
    data: {
      clientId: userIds.anna,
      packageId: pkgIds[EventType.WEDDING],
      eventType: EventType.WEDDING,
      eventDate: futureDate(90),
      venue: "The Ruins, Talisay City, Negros Occidental",
      venueLatitude: 10.7202,
      venueLongitude: 122.9656,
      venueFormattedAddress: "The Ruins, Talisay City, Negros Occidental, Philippines",
      guestCount: 120,
      isProvincial: true,
      agreedPrice: 97750, // provincial rate for classic wedding
      status: BookingStatus.PENDING,
      notes: "Please arrange for a string quartet during the reception.",
      packageCustomizations: ["String quartet", "Garden setup", "Gold candelabras"],
    },
  })
  console.log(`  ✅  PENDING   | Anna | Wedding  +90d  | provincial ₱97,750  id=${annaWedding.id}`)

  // ── 4. Ben — Birthday PENDING (provincial, no deposit) ────────────────────
  await prisma.booking.create({
    data: {
      clientId: userIds.ben,
      packageId: pkgIds[EventType.BIRTHDAY],
      eventType: EventType.BIRTHDAY,
      eventDate: futureDate(14),
      venue: "Balay ni Atong, A. Vestil St, Cebu City",
      guestCount: 60,
      isProvincial: true,
      agreedPrice: 34500, // provincial birthday rate
      status: BookingStatus.PENDING,
      notes: "Dinosaur theme for the kids.",
    },
  })
  console.log(`  ✅  PENDING   | Ben  | Birthday +14d  | provincial ₱34,500`)

  // ── 5. Anna — Wedding CANCELLED (past, provincial) ────────────────────────
  await prisma.booking.create({
    data: {
      clientId: userIds.anna,
      packageId: pkgIds[EventType.WEDDING],
      eventType: EventType.WEDDING,
      eventDate: pastDate(10),
      venue: "Plantation Bay Resort, Marigondon, Mactan, Lapu-Lapu City",
      guestCount: 80,
      isProvincial: true,
      agreedPrice: 97750, // provincial
      status: BookingStatus.CANCELLED,
      cancellationReason: "Client requested cancellation due to venue conflict.",
    },
  })
  console.log(`  ✅  CANCELLED | Anna | Wedding  -10d  | provincial ₱97,750`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱  Starting seed (Modules 1, 2 & 3 — with agreedPrice)…")

  if (!process.env.CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY is required.")
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.")

  // Cleanup order: installments → payments → bookings → auditLog (users last)
  console.log("\n🧹  Cleaning up existing data…")
  await prisma.installment.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.auditLog.deleteMany()

  // ── Users ──────────────────────────────────────────────────
  console.log("\n👤  Seeding users…\n")
  for (const u of USERS) await cleanupUser(u)
  console.log()

  const userDbIds: Record<string, string> = {}
  for (const u of USERS) userDbIds[u.username] = await createUser(u)

  // ── Packages ───────────────────────────────────────────────
  const pkgIds = await seedPackages()

  // ── Bookings, Payments & Installments ─────────────────────
  await seedBookingsAndPayments(pkgIds, {
    admin: userDbIds["admin"],
    coordinator: userDbIds["coordinator"],
    anna: userDbIds["client_anna"],
    ben: userDbIds["client_ben"],
  })

  // ── Summary ────────────────────────────────────────────────
  console.log("\n✨  Seed complete!\n")
  console.log("  ┌────────────────────────────────────────────────────────────────────────────┐")
  console.log("  │  Staff accounts — login at /staff-login                                    │")
  console.log("  ├─────────────┬─────────────┬──────────────────┬──────────────────────────────┤")
  console.log("  │ Role        │ Username    │ Password         │ Full Name                    │")
  console.log("  ├─────────────┼─────────────┼──────────────────┼──────────────────────────────┤")
  console.log("  │ ADMIN       │ admin       │ FabMemories123!  │ System Administrator         │")
  console.log("  │ COORDINATOR │ coordinator │ FabMemories123!  │ Maria Santos                 │")
  console.log("  │ VENDOR      │ vendor      │ FabMemories123!  │ Juan dela Cruz               │")
  console.log("  ├─────────────┴─────────────┴──────────────────┴──────────────────────────────┤")
  console.log("  │  Client accounts — login at /sign-in (by email)                            │")
  console.log("  ├──────────────┬───────────────────────────────────────┬─────────────────────┤")
  console.log("  │ Name         │ Email                                 │ Password            │")
  console.log("  ├──────────────┼───────────────────────────────────────┼─────────────────────┤")
  console.log("  │ Anna Reyes   │ anna.fabmemories@example.com          │ FabMemories123!     │")
  console.log("  │ Ben Torres   │ ben.fabmemories@example.com           │ FabMemories123!     │")
  console.log("  └──────────────┴───────────────────────────────────────┴─────────────────────┘\n")
  console.log("  Packages : 5   (all have standard + provincial prices)")
  console.log("  Bookings : 5   (CONFIRMED×1, PENDING×3, CANCELLED×1)")
  console.log("  Payments : 4   (VERIFIED deposit + inst#1, SUBMITTED inst#2, SUBMITTED deposit)")
  console.log("  Installs : 3   (PAID×1, UNPAID overdue×1, UNPAID future×1)\n")
  console.log("  agreedPrice test scenarios:")
  console.log("    Anna Debut  → provincial ₱74,750  (standard ₱65,000  + 15%)")
  console.log("    Ben  Corp   → metro      ₱50,000  (standard rate)")
  console.log("    Anna Wedding→ provincial ₱97,750  (standard ₱85,000  + 15%)")
  console.log("    Ben  Birth  → provincial ₱34,500  (standard ₱30,000  + 15%)")
  console.log("    Anna Cancel → provincial ₱97,750  (standard ₱85,000  + 15%)\n")
  console.log("  ⚠️  Change all passwords after first login.")
  console.log("  ⚠️  Never commit seed passwords to source control.\n")
}

main()
  .catch((err) => { console.error("\n❌  Seed failed:", err); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
