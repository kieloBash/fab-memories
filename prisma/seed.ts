// prisma/seed.ts
/**
 * Seeds the database with test data for Modules 1, 2 & 3:
 *
 *   Users (Clerk + Prisma):
 *     - 1 ADMIN, 1 COORDINATOR, 1 VENDOR, 2 CLIENTs
 *
 *   Packages:
 *     - 2 Wedding, 1 Debut, 1 Corporate, 1 Birthday
 *
 *   Bookings:
 *     - 2 PENDING, 2 CONFIRMED, 1 CANCELLED
 *
 *   Payments (on CONFIRMED bookings):
 *     - 1 SUBMITTED  (awaiting staff verification)
 *     - 1 VERIFIED   (with auto-generated installment schedule)
 *     - 1 FLAGGED    (client needs to resubmit)
 *
 *   Installments:
 *     - 3-installment schedule on the VERIFIED payment
 *       (1 PAID, 2 UNPAID — one overdue)
 *
 * Safe to re-run — full Clerk + Prisma cleanup before recreating.
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface SeedUser {
  username: string
  password: string
  fullName: string
  email: string
  role: Role
}

// ── User definitions ──────────────────────────────────────────────────────────

const SEED_USERS: SeedUser[] = [
  {
    username: process.env.SEED_ADMIN_USERNAME ?? "admin",
    password: process.env.SEED_ADMIN_PASSWORD ?? "FabMemories123!",
    fullName: process.env.SEED_ADMIN_FULLNAME ?? "System Administrator",
    email: process.env.SEED_ADMIN_EMAIL ?? "admin.fabmemories@example.com",
    role: Role.ADMIN,
  },
  {
    username: "coordinator",
    password: "FabMemories123!",
    fullName: "Maria Santos",
    email: "coordinator.fabmemories@example.com",
    role: Role.COORDINATOR,
  },
  {
    username: "vendor",
    password: "FabMemories123!",
    fullName: "Juan dela Cruz",
    email: "vendor.fabmemories@example.com",
    role: Role.VENDOR,
  },
  {
    username: "client_anna",
    password: "FabMemories123!",
    fullName: "Anna Reyes",
    email: "anna.fabmemories@example.com",
    role: Role.CLIENT,
  },
  {
    username: "client_ben",
    password: "FabMemories123!",
    fullName: "Ben Torres",
    email: "ben.fabmemories@example.com",
    role: Role.CLIENT,
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function futureDate(daysFromNow: number): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setDate(d.getDate() + daysFromNow)
  return d
}

function pastDate(daysAgo: number): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return d
}

async function cleanupClerkUser(email: string, clerkId?: string): Promise<void> {
  if (clerkId) {
    try {
      await clerk.users.deleteUser(clerkId)
      console.log(`    🗑  Deleted Clerk user  clerkId=${clerkId}`)
      return
    } catch (err: any) {
      if (err?.status !== 404) {
        console.warn(`    ⚠️  Could not delete Clerk user ${clerkId}:`, err?.message)
      }
    }
  }

  try {
    const result = await clerk.users.getUserList({ emailAddress: [email], limit: 1 })
    if (result.data.length > 0) {
      await clerk.users.deleteUser(result.data[0].id)
      console.log(`    🗑  Deleted orphaned Clerk user  email=${email}`)
    }
  } catch (err: any) {
    console.warn(`    ⚠️  Clerk lookup failed for ${email}:`, err?.message)
  }
}

async function cleanupUser(user: SeedUser): Promise<void> {
  console.log(`  🔍  Checking "${user.username}" (${user.role})…`)
  const existing = await prisma.user.findUnique({ where: { username: user.username } })

  if (existing) {
    await cleanupClerkUser(user.email, existing.clerkId)
    await prisma.user.delete({ where: { id: existing.id } })
    console.log(`    🗑  Deleted Prisma user  id=${existing.id}`)
  } else {
    await cleanupClerkUser(user.email)
  }
}

async function createUser(user: SeedUser): Promise<string> {
  const isStaff = user.role !== Role.CLIENT

  const clerkUser = await clerk.users.createUser({
    username: user.username,
    password: user.password,
    emailAddress: [isStaff ? `seed.${user.username}@example.com` : user.email],
    publicMetadata: { role: user.role satisfies Role },
    skipPasswordChecks: false,
  })

  const dbUser = await prisma.user.create({
    data: {
      clerkId: clerkUser.id,
      username: user.username,
      fullName: user.fullName,
      email: isStaff ? null : user.email,
      role: user.role,
    },
  })

  console.log(`  ✅  ${user.role.padEnd(11)} "${user.username}"  clerkId=${clerkUser.id}`)
  return dbUser.id
}

// ── Package seed ──────────────────────────────────────────────────────────────

const SEED_PACKAGES = [
  {
    name: "Classic Wedding Package",
    description: "An elegant, all-inclusive wedding package perfect for intimate ceremonies.",
    eventType: EventType.WEDDING,
    price: 85000,
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
  console.log("  🗑  Cleared existing packages")

  const idMap: Record<string, string> = {}
  for (const pkg of SEED_PACKAGES) {
    const created = await prisma.package.create({ data: pkg })
    console.log(`  ✅  ${pkg.eventType.padEnd(11)} "${pkg.name}"  id=${created.id}`)
    if (!idMap[pkg.eventType]) idMap[pkg.eventType] = created.id
  }
  return idMap
}

// ── Booking seed ──────────────────────────────────────────────────────────────

async function seedBookings(
  pkgIds: Record<string, string>,
  userIds: { admin: string; coordinator: string; anna: string; ben: string },
): Promise<{ confirmedAnna: string; confirmedBen: string }> {
  console.log("\n📅  Seeding bookings…\n")
  await prisma.booking.deleteMany()
  console.log("  🗑  Cleared existing bookings\n")

  const rows = [
    {
      label: "PENDING   | Anna | Wedding  +30d",
      data: {
        clientId: userIds.anna,
        packageId: pkgIds[EventType.WEDDING],
        eventType: EventType.WEDDING,
        eventDate: futureDate(30),
        venue: "The Ruins, Talisay City, Negros Occidental",
        guestCount: 120,
        status: BookingStatus.PENDING,
        notes: "Please arrange for a string quartet during the reception.",
      },
    },
    {
      label: "PENDING   | Ben  | Birthday +14d",
      data: {
        clientId: userIds.ben,
        packageId: pkgIds[EventType.BIRTHDAY],
        eventType: EventType.BIRTHDAY,
        eventDate: futureDate(14),
        venue: "Balay ni Atong, Cebu City",
        guestCount: 60,
        status: BookingStatus.PENDING,
        notes: "Dinosaur theme for the kids.",
      },
    },
    {
      label: "CONFIRMED | Anna | Debut    +45d",
      data: {
        clientId: userIds.anna,
        packageId: pkgIds[EventType.DEBUT],
        eventType: EventType.DEBUT,
        eventDate: futureDate(45),
        venue: "Waterfront Hotel, Lahug, Cebu City",
        guestCount: 200,
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmedById: userIds.coordinator,
        notes: "Gold and white color motif.",
      },
    },
    {
      label: "CONFIRMED | Ben  | Corporate +60d",
      data: {
        clientId: userIds.ben,
        packageId: pkgIds[EventType.CORPORATE],
        eventType: EventType.CORPORATE,
        eventDate: futureDate(60),
        venue: "Radisson Blu, Cebu City",
        guestCount: 300,
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmedById: userIds.admin,
      },
    },
    {
      label: "CANCELLED | Anna | Wedding  -10d",
      data: {
        clientId: userIds.anna,
        packageId: pkgIds[EventType.WEDDING],
        eventType: EventType.WEDDING,
        eventDate: pastDate(10),
        venue: "Plantation Bay Resort, Mactan",
        guestCount: 80,
        status: BookingStatus.CANCELLED,
        cancellationReason: "Client requested cancellation due to venue conflict.",
      },
    },
  ]

  const ids: Record<string, string> = {}
  for (const { label, data } of rows) {
    const created = await prisma.booking.create({ data })
    console.log(`  ✅  ${label}  id=${created.id}`)
    ids[label] = created.id
  }

  return {
    confirmedAnna: ids["CONFIRMED | Anna | Debut    +45d"],
    confirmedBen: ids["CONFIRMED | Ben  | Corporate +60d"],
  }
}

// ── Payment + Installment seed ────────────────────────────────────────────────

async function seedPayments(
  bookingIds: { confirmedAnna: string; confirmedBen: string },
  userIds: { admin: string; coordinator: string },
): Promise<void> {
  console.log("\n💳  Seeding payments…\n")
  await prisma.installment.deleteMany()
  await prisma.payment.deleteMany()
  console.log("  🗑  Cleared existing payments & installments\n")

  // ── Payment 1: SUBMITTED — awaiting verification (Anna's debut booking) ──
  const submitted = await prisma.payment.create({
    data: {
      bookingId: bookingIds.confirmedAnna,
      method: PaymentMethod.GCASH,
      status: PaymentStatus.SUBMITTED,
      amount: 32500, // partial — 50% of Debut package (65000)
      referenceNumber: "GC-20250001",
      submittedAt: new Date(),
    },
  })
  console.log(`  ✅  SUBMITTED  | Anna  | GCash ref GC-20250001      id=${submitted.id}`)

  // ── Payment 2: VERIFIED — with installment schedule (Ben's corporate booking) ──
  const verified = await prisma.payment.create({
    data: {
      bookingId: bookingIds.confirmedBen,
      method: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.VERIFIED,
      amount: 50000, // full Corporate package price
      referenceNumber: "BT-20250042",
      submittedAt: pastDate(20),
      verifiedById: userIds.admin,
      verifiedAt: pastDate(18),
      verificationNote: "Bank transfer confirmed. Installment schedule generated.",
    },
  })
  console.log(`  ✅  VERIFIED   | Ben   | Bank transfer BT-20250042  id=${verified.id}`)

  // Auto-generate 3-installment schedule for the verified payment
  // Installment 1: PAID (20 days ago)
  // Installment 2: UNPAID overdue (-5 days)
  // Installment 3: UNPAID future (+25 days)
  const installments = [
    {
      paymentId: verified.id,
      order: 1,
      dueDate: pastDate(48),
      amount: 16667,
      status: InstallmentStatus.PAID,
      paidAt: pastDate(46),
      note: "Paid via bank transfer",
    },
    {
      paymentId: verified.id,
      order: 2,
      dueDate: pastDate(5),
      amount: 16667,
      status: InstallmentStatus.UNPAID,
    },
    {
      paymentId: verified.id,
      order: 3,
      dueDate: futureDate(25),
      amount: 16666, // absorbs rounding remainder
      status: InstallmentStatus.UNPAID,
    },
  ]

  for (const inst of installments) {
    await prisma.installment.create({ data: inst })
  }
  console.log(`  ✅  3 installments created (1 PAID, 1 UNPAID overdue, 1 UNPAID future)`)

  // ── Payment 3: FLAGGED — client needs to resubmit (Anna's debut booking) ──
  const flagged = await prisma.payment.create({
    data: {
      bookingId: bookingIds.confirmedAnna,
      method: PaymentMethod.GCASH,
      status: PaymentStatus.FLAGGED,
      amount: 32500,
      referenceNumber: "GC-20249999",
      submittedAt: pastDate(5),
      verifiedById: userIds.coordinator,
      verifiedAt: pastDate(4),
      verificationNote: "Screenshot is blurry. Please resubmit a clearer proof.",
    },
  })
  console.log(`  ✅  FLAGGED    | Anna  | GCash ref GC-20249999      id=${flagged.id}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱  Starting seed (Modules 1, 2 & 3)…")

  if (!process.env.CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY is required.")
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.")

  // Order matters: installments → payments → bookings → packages → users
  console.log("\n👤  Seeding users…\n")
  await prisma.installment.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.auditLog.deleteMany()

  for (const user of SEED_USERS) await cleanupUser(user)
  console.log()

  const userDbIds: Record<string, string> = {}
  for (const user of SEED_USERS) {
    userDbIds[user.username] = await createUser(user)
  }

  const pkgIds = await seedPackages()

  const bookingIds = await seedBookings(pkgIds, {
    admin: userDbIds["admin"],
    coordinator: userDbIds["coordinator"],
    anna: userDbIds["client_anna"],
    ben: userDbIds["client_ben"],
  })

  await seedPayments(bookingIds, {
    admin: userDbIds["admin"],
    coordinator: userDbIds["coordinator"],
  })

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n✨  Seed complete!\n")
  console.log("  ┌──────────────────────────────────────────────────────────────────────────┐")
  console.log("  │  Staff accounts — login at /staff-login                                  │")
  console.log("  ├─────────────┬─────────────┬──────────────────┬────────────────────────────┤")
  console.log("  │ Role        │ Username    │ Password         │ Full Name                  │")
  console.log("  ├─────────────┼─────────────┼──────────────────┼────────────────────────────┤")
  console.log("  │ ADMIN       │ admin       │ FabMemories123!  │ System Administrator       │")
  console.log("  │ COORDINATOR │ coordinator │ FabMemories123!  │ Maria Santos               │")
  console.log("  │ VENDOR      │ vendor      │ FabMemories123!  │ Juan dela Cruz             │")
  console.log("  ├─────────────┴─────────────┴──────────────────┴────────────────────────────┤")
  console.log("  │  Client accounts — login at /sign-in (by email)                          │")
  console.log("  ├──────────────┬───────────────────────────────────┬───────────────────────┤")
  console.log("  │ Name         │ Email                             │ Password              │")
  console.log("  ├──────────────┼───────────────────────────────────┼───────────────────────┤")
  console.log("  │ Anna Reyes   │ anna.fabmemories@example.com      │ FabMemories123!       │")
  console.log("  │ Ben Torres   │ ben.fabmemories@example.com       │ FabMemories123!       │")
  console.log("  └──────────────┴───────────────────────────────────┴───────────────────────┘\n")
  console.log("  Packages  : 5   (Wedding ×2, Debut ×1, Corporate ×1, Birthday ×1)")
  console.log("  Bookings  : 5   (PENDING ×2, CONFIRMED ×2, CANCELLED ×1)")
  console.log("  Payments  : 3   (SUBMITTED ×1, VERIFIED ×1, FLAGGED ×1)")
  console.log("  Installments: 3 (PAID ×1, UNPAID overdue ×1, UNPAID future ×1)\n")
  console.log("  ⚠️  Change all passwords immediately after first login.")
  console.log("  ⚠️  Never commit seed passwords to source control.\n")
}

main()
  .catch((err) => {
    console.error("\n❌  Seed failed:", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
