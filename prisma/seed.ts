// prisma/seed.ts
/**
 * Seeds the database with a full set of test accounts:
 *   - 1 ADMIN
 *   - 1 COORDINATOR
 *   - 1 VENDOR
 *   - 1 CLIENT (self-registered flow simulation)
 *
 * Safe to run repeatedly — finds and deletes existing Clerk users and
 * Prisma rows for each seed account before recreating them, so you
 * always get a clean slate.
 *
 * Usage:
 *   npx prisma db seed
 *
 * Required env vars (.env.local):
 *   CLERK_SECRET_KEY
 *   DATABASE_URL
 *
 * Optional env vars (fall back to defaults below):
 *   SEED_ADMIN_USERNAME      (default: "admin")
 *   SEED_ADMIN_PASSWORD      (default: "FabMemories123!")
 *   SEED_ADMIN_FULLNAME      (default: "System Administrator")
 *   SEED_ADMIN_EMAIL         (default: "admin.fabmemories@example.com")
 *
 * IMPORTANT: never commit real passwords to source control.
 *            Change all seeded passwords immediately after first login.
 */

import { PrismaClient, Role } from "@/app/generated/prisma/client"
import { createClerkClient } from "@clerk/backend"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"

// ── Client setup ──────────────────────────────────────────────────────────────

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
})

// ── Seed account definitions ──────────────────────────────────────────────────

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
    fullName: "Test Coordinator",
    email: "coordinator.fabmemories@example.com",
    role: Role.COORDINATOR,
  },
  {
    username: "vendor",
    password: "FabMemories123!",
    fullName: "Test Vendor",
    email: "vendor.fabmemories@example.com",
    role: Role.VENDOR,
  },
  {
    // CLIENT uses email-based sign-up (no username) — we give a username
    // here only so the seed can identify and clean up the account on re-run.
    username: "testclient",
    password: "FabMemories123!",
    fullName: "Test Client",
    email: "client.fabmemories@example.com",
    role: Role.CLIENT,
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Finds and deletes a Clerk user by username or email, then removes the
 * matching Prisma row. Logs each step so the console output is clear on
 * re-runs. Never throws — cleanup failures are warnings, not blockers.
 */
async function cleanupExistingUser(user: SeedUser): Promise<void> {
  console.log(`  🔍  Checking for existing "${user.username}" (${user.role})...`)

  // 1. Try to find by username in Prisma first (fast)
  const prismaUser = await prisma.user.findUnique({
    where: { username: user.username },
  })

  if (prismaUser) {
    // Delete from Clerk using the stored clerkId
    try {
      await clerk.users.deleteUser(prismaUser.clerkId)
      console.log(`  🗑   Deleted Clerk user  clerkId=${prismaUser.clerkId}`)
    } catch (err: any) {
      // 404 means already gone from Clerk — safe to continue
      if (err?.status !== 404) {
        console.warn(`  ⚠️   Could not delete Clerk user ${prismaUser.clerkId}:`, err?.message)
      }
    }

    // Delete from Prisma (cascade clears audit logs with SetNull)
    await prisma.user.delete({ where: { id: prismaUser.id } })
    console.log(`  🗑   Deleted Prisma user  id=${prismaUser.id}`)
    return
  }

  // 2. Prisma row not found — check Clerk by email in case the webhook
  //    failed to mirror the user on a previous partial run.
  try {
    const clerkUsers = await clerk.users.getUserList({
      emailAddress: [user.email],
      limit: 1,
    })

    if (clerkUsers.data.length > 0) {
      const clerkId = clerkUsers.data[0].id
      await clerk.users.deleteUser(clerkId)
      console.log(`  🗑   Deleted orphaned Clerk user  clerkId=${clerkId} (no Prisma row)`)
    }
  } catch (err: any) {
    console.warn(`  ⚠️   Clerk lookup by email failed for ${user.email}:`, err?.message)
  }
}

/**
 * Creates a single user in both Clerk and Prisma.
 * Staff roles (ADMIN, COORDINATOR, VENDOR) use username + placeholder email.
 * CLIENT role uses the real email (mirrors self-registration flow).
 */
async function createUser(user: SeedUser): Promise<void> {
  const isStaff = user.role !== Role.CLIENT

  console.log(`  ➕  Creating ${user.role} "${user.username}"...`)

  // Clerk creation
  const clerkUser = await clerk.users.createUser({
    username: user.username,
    password: user.password,
    // Staff get a synthetic placeholder — they log in via username only.
    // Clients get a real email — they log in via email.
    emailAddress: [isStaff ? `seed.${user.username}.${Date.now()}@example.com` : user.email],
    publicMetadata: { role: user.role satisfies Role },
    skipPasswordChecks: false,
  })

  // Prisma mirror
  await prisma.user.create({
    data: {
      clerkId: clerkUser.id,
      username: user.username,
      fullName: user.fullName,
      email: isStaff ? null : user.email,
      role: user.role,
    },
  })

  console.log(`  ✅  ${user.role} "${user.username}" ready  clerkId=${clerkUser.id}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱  Starting seed...\n")

  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY env var is required.")
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL env var is required.")
  }

  for (const user of SEED_USERS) {
    await cleanupExistingUser(user)
    await createUser(user)
    console.log()
  }

  console.log("✨  Seed complete!\n")
  console.log("  Account credentials (change after first login):")
  console.log("  ┌─────────────────┬──────────────┬─────────────────┬──────────────────────────┐")
  console.log("  │ Role            │ Username     │ Password        │ Login URL                │")
  console.log("  ├─────────────────┼──────────────┼─────────────────┼──────────────────────────┤")
  console.log("  │ ADMIN           │ admin        │ FabMemories123! │ /staff-login             │")
  console.log("  │ COORDINATOR     │ coordinator  │ FabMemories123! │ /staff-login             │")
  console.log("  │ VENDOR          │ vendor       │ FabMemories123! │ /staff-login             │")
  console.log("  │ CLIENT          │ testclient   │ FabMemories123! │ /sign-in (email)         │")
  console.log("  └─────────────────┴──────────────┴─────────────────┴──────────────────────────┘")
  console.log("  Client email: client.fabmemories@example.com\n")
}

main()
  .catch((err) => {
    console.error("\n❌  Seed failed:", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
