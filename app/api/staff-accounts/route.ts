import { createStaffAccountSchema } from '@/features/staff-accounts/staff-accounts.schema';
import { logAction } from '@/lib/audit/log';
import { getCurrentDbUser, requireAdmin } from '@/lib/clerk/auth';
import { clerkClient } from '@/lib/clerk/client';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
        where: { role: { not: 'CLIENT' } },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
}

export async function POST(req: Request) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createStaffAccountSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 422 });
    }
    const { username, password, fullName, role } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const clerk = await clerkClient();
    let clerkUserId: string | null = null;

    try {
        // Instance-wide Email requirement applies to backend-created users too,
        // so staff get a synthetic, never-verified placeholder email using
        // IANA's reserved example.com domain — always passes format validation,
        // never resolves to a real inbox. Staff authenticate via username only.
        const placeholderEmail = `staff.${username}.${Date.now()}@example.com`;

        const clerkUser = await clerk.users.createUser({
            username,
            password,
            emailAddress: [placeholderEmail],
            skipPasswordChecks: false,
            publicMetadata: { role },
        });
        clerkUserId = clerkUser.id;

        const dbUser = await prisma.user.create({
            data: {
                clerkId: clerkUser.id,
                username,
                fullName,
                role,
            },
        });

        const actor = await getCurrentDbUser();

        await logAction({
            userId: actor?.id,
            action: 'CREATE',
            module: 'USER_MANAGEMENT',
            description: `Admin created ${role} account`,
            metadata: { targetUserId: dbUser.id, role },
        });

        return NextResponse.json(dbUser, { status: 201 });
    } catch (err) {
        if (clerkUserId) {
            await clerk.users.deleteUser(clerkUserId).catch((cleanupErr) => {
                console.error('Failed to roll back orphaned Clerk user:', cleanupErr);
            });
        }
        console.error('Failed to create staff account:', err);
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }
}
