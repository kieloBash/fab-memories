/**
 * Bootstraps the first ADMIN account.
 *
 * There is no public sign-up flow for staff, so the very first admin
 * must be created directly against Clerk's Backend API, then mirrored
 * into Prisma. Run this once:
 *
 *   npx prisma db seed
 *
 * Required env vars (.env.local):
 *   CLERK_SECRET_KEY
 *   DATABASE_URL
 *   SEED_ADMIN_USERNAME   (optional, defaults to "admin")
 *   SEED_ADMIN_PASSWORD   (required — must meet Clerk's password rules)
 *   SEED_ADMIN_FULLNAME   (optional, defaults to "System Administrator")
 *
 * IMPORTANT: change the seeded password immediately after first login,
 * and never commit SEED_ADMIN_PASSWORD to source control.
 */

import { PrismaClient, Role } from '@/app/generated/prisma/client';
import { createClerkClient } from '@clerk/backend';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

async function main() {
    const username = process.env.SEED_ADMIN_USERNAME ?? 'admin';
    const password = process.env.SEED_ADMIN_PASSWORD ?? "FabMemories123!";
    const fullName = process.env.SEED_ADMIN_FULLNAME ?? 'System Administrator';
    const emailAddress = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';

    if (!password) {
        throw new Error('SEED_ADMIN_PASSWORD env var is required to run this seed.');
    }

    // Check Prisma first — avoid creating a duplicate Clerk user on re-run.
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
        console.log(`Admin user "${username}" already exists in Prisma. Skipping.`);
        return;
    }

    console.log(`Creating admin user "${username}" in Clerk...`);
    const clerkUser = await clerkClient.users.createUser({
        username,
        password,
        emailAddress: [emailAddress],
        publicMetadata: { role: 'ADMIN' satisfies Role },
        skipPasswordChecks: false,
    });

    console.log(`Mirroring admin user into Prisma...`);
    await prisma.user.create({
        data: {
            clerkId: clerkUser.id,
            username,
            fullName,
            role: Role.ADMIN,
        },
    });

    console.log(`✅ Admin account created. clerkId=${clerkUser.id} username=${username}`);
    console.log(`   Log in at /staff-login, then change the password immediately.`);
}

main()
    .catch((err) => {
        console.error('Seed failed:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });