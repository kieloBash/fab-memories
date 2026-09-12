// lib/prisma.ts

import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

/**
 * Uses RUNTIME_DATABASE_URL when set — this should point at the
 * restricted `app_runtime` role (see prisma/scripts/create-restricted-role.sql),
 * which cannot UPDATE/DELETE/TRUNCATE the audit tables, making the
 * database-level lockdown in Module 7 actually take effect.
 *
 * Falls back to DATABASE_URL (the full-privilege migration role) if
 * RUNTIME_DATABASE_URL isn't set — e.g. in local dev before you've
 * gone through the role-split setup. This means the app still runs
 * fine without it; the lockdown just isn't enforced until you do.
 */
const connectionString = process.env.RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL!

const adapter = new PrismaPg({ connectionString })

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}