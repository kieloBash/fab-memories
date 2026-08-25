// prisma/seed.ts
/**
 * Seeds the database with test data for Modules 1 & 2:
 *
 *   Users (Clerk + Prisma):
 *     - 1 ADMIN
 *     - 1 COORDINATOR
 *     - 1 VENDOR
 *     - 2 CLIENTs
 *
 *   Packages:
 *     - 2 Wedding, 1 Debut, 1 Corporate, 1 Birthday
 *
 *   Bookings (spread across statuses):
 *     - 2 PENDING
 *     - 2 CONFIRMED
 *     - 1 CANCELLED
 *
 * Safe to re-run — deletes existing Clerk users and all Prisma rows
 * before recreating from scratch.
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
} from "@/app/generated/prisma/client"
import { createClerkClient } from "@clerk/backend"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"

// ── Client setup ──────────────────────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

// ── Seed definitions ──────────────────────────────────────────────────────────

interface SeedUser {
  username: string
  password: string
  fullName: string
  email: string
  role: Role
}

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

async function cleanupClerkUser(email: string, clerkId?: string): Promise<void> {
  // Try by known clerkId first (fast path)
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

  // Fall back to email lookup (catches orphaned Clerk users from partial runs)
  try {
    const result = await clerk.users.getUserList({ emailAddress: [email], limit: 1 })
    if (result.data.length > 0) {
      await clerk.users.deleteUser(result.data[0].id)
      console.log(`    🗑  Deleted orphaned Clerk user  email=${email}`)
    }
  } catch (err: any) {
    console.warn(`    ⚠️  Clerk lookup by email failed for ${email}:`, err?.message)
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
    // Prisma row missing — still check Clerk in case webhook failed
    await cleanupClerkUser(user.email)
  }
}

async function createUser(user: SeedUser): Promise<string> {
  const isStaff = user.role !== Role.CLIENT

  const clerkUser = await clerk.users.createUser({
    username: user.username,
    password: user.password,
    emailAddress: [
      isStaff
        ? `seed.${user.username}@example.com`
        : user.email,
    ],
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

// ── Package seed data ─────────────────────────────────────────────────────────

interface SeedPackage {
  name: string
  description: string
  eventType: EventType
  price: number
  inclusions: string[]
}

const SEED_PACKAGES: SeedPackage[] = [
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
      "Debut coordinator on-site",
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

async function seedPackages(): Promise<Record<EventType, string>> {
  console.log("\n📦  Seeding packages…\n")

  // Clear existing packages (cascade clears booking FK on next step)
  await prisma.package.deleteMany()
  console.log("  🗑  Cleared existing packages")

  const idMap: Partial<Record<EventType, string>> = {}

  for (const pkg of SEED_PACKAGES) {
    const created = await prisma.package.create({
      data: {
        name: pkg.name,
        description: pkg.description,
        eventType: pkg.eventType,
        price: pkg.price,
        inclusions: pkg.inclusions,
      },
    })
    console.log(`  ✅  ${pkg.eventType.padEnd(11)} "${pkg.name}"  id=${created.id}`)
    // Store one representative id per event type for booking seed
    if (!idMap[pkg.eventType]) idMap[pkg.eventType] = created.id
  }

  return idMap as Record<EventType, string>
}

// ── Booking seed ──────────────────────────────────────────────────────────────

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

async function seedBookings(
  packageIdByType: Record<EventType, string>,
  userIds: { admin: string; coordinator: string; anna: string; ben: string },
): Promise<void> {
  console.log("\n📅  Seeding bookings…\n")

  await prisma.booking.deleteMany()
  console.log("  🗑  Cleared existing bookings\n")

  const bookings: {
    label: string
    data: Parameters<typeof prisma.booking.create>[0]["data"]
  }[] = [
      // ── PENDING ───────────────────────────────────────────────
      {
        label: "PENDING  | Anna   | Wedding (future +30d)",
        data: {
          clientId: userIds.anna,
          packageId: packageIdByType[EventType.WEDDING],
          eventType: EventType.WEDDING,
          eventDate: futureDate(30),
          venue: "The Ruins, Talisay City, Negros Occidental",
          guestCount: 120,
          status: BookingStatus.PENDING,
          notes: "Please arrange for a string quartet during the reception.",
        },
      },
      {
        label: "PENDING  | Ben    | Birthday (future +14d)",
        data: {
          clientId: userIds.ben,
          packageId: packageIdByType[EventType.BIRTHDAY],
          eventType: EventType.BIRTHDAY,
          eventDate: futureDate(14),
          venue: "Balay ni Atong, Cebu City",
          guestCount: 60,
          status: BookingStatus.PENDING,
          notes: "Dinosaur theme for the kids.",
        },
      },

      // ── CONFIRMED ─────────────────────────────────────────────
      {
        label: "CONFIRMED | Anna   | Debut (future +45d)",
        data: {
          clientId: userIds.anna,
          packageId: packageIdByType[EventType.DEBUT],
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
        label: "CONFIRMED | Ben    | Corporate (future +60d)",
        data: {
          clientId: userIds.ben,
          packageId: packageIdByType[EventType.CORPORATE],
          eventType: EventType.CORPORATE,
          eventDate: futureDate(60),
          venue: "Radisson Blu, Cebu City",
          guestCount: 300,
          status: BookingStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedById: userIds.admin,
        },
      },

      // ── CANCELLED ─────────────────────────────────────────────
      {
        label: "CANCELLED | Anna   | Wedding (past -10d)",
        data: {
          clientId: userIds.anna,
          packageId: packageIdByType[EventType.WEDDING],
          eventType: EventType.WEDDING,
          eventDate: pastDate(10),
          venue: "Plantation Bay Resort, Mactan",
          guestCount: 80,
          status: BookingStatus.CANCELLED,
          cancellationReason: "Client requested cancellation due to venue conflict.",
          notes: "Originally requested garden setup.",
        },
      },
    ]

  for (const { label, data } of bookings) {
    const created = await prisma.booking.create({ data })
    console.log(`  ✅  ${label}`)
    console.log(`       id=${created.id}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱  Starting seed (Modules 1 & 2)…")

  if (!process.env.CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY is required.")
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.")

  // ── Step 1: Users ──────────────────────────────────────────
  console.log("\n👤  Seeding users…\n")

  // Cleanup first (order matters — bookings reference users, so clear them first)
  await prisma.booking.deleteMany()
  await prisma.auditLog.deleteMany()

  for (const user of SEED_USERS) {
    await cleanupUser(user)
  }

  console.log()

  const userDbIds: Record<string, string> = {}
  for (const user of SEED_USERS) {
    const id = await createUser(user)
    userDbIds[user.username] = id
  }

  // ── Step 2: Packages ───────────────────────────────────────
  const packageIdByType = await seedPackages()

  // ── Step 3: Bookings ───────────────────────────────────────
  await seedBookings(packageIdByType, {
    admin: userDbIds["admin"],
    coordinator: userDbIds["coordinator"],
    anna: userDbIds["client_anna"],
    ben: userDbIds["client_ben"],
  })

  // ── Summary ────────────────────────────────────────────────
  console.log("\n✨  Seed complete!\n")
  console.log("  ┌──────────────────────────────────────────────────────────────────────┐")
  console.log("  │  Staff accounts (login at /staff-login)                              │")
  console.log("  ├──────────────────┬─────────────┬─────────────────┬──────────────────┤")
  console.log("  │ Role             │ Username    │ Password        │ Full Name        │")
  console.log("  ├──────────────────┼─────────────┼─────────────────┼──────────────────┤")
  console.log("  │ ADMIN            │ admin       │ FabMemories123! │ System Admin     │")
  console.log("  │ COORDINATOR      │ coordinator │ FabMemories123! │ Maria Santos     │")
  console.log("  │ VENDOR           │ vendor      │ FabMemories123! │ Juan dela Cruz   │")
  console.log("  ├──────────────────┴─────────────┴─────────────────┴──────────────────┤")
  console.log("  │  Client accounts (login at /sign-in via email)                       │")
  console.log("  ├──────────────────┬──────────────────────────┬────────────────────────┤")
  console.log("  │ Full Name        │ Email                    │ Password               │")
  console.log("  ├──────────────────┼──────────────────────────┼────────────────────────┤")
  console.log("  │ Anna Reyes       │ anna.fabmemories@example.com    │ FabMemories123!        │")
  console.log("  │ Ben Torres       │ ben.fabmemories@example.com     │ FabMemories123!        │")
  console.log("  └──────────────────┴──────────────────────────┴────────────────────────┘")
  console.log()
  console.log("  Packages seeded : 5  (Wedding ×2, Debut ×1, Corporate ×1, Birthday ×1)")
  console.log("  Bookings seeded : 5  (PENDING ×2, CONFIRMED ×2, CANCELLED ×1)")
  console.log()
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
