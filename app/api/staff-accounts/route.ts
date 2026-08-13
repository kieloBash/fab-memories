import type { Role } from '@/app/generated/prisma/client';
import { requireAdmin } from '@/lib/clerk/auth';
import { clerkClient } from '@/lib/clerk/client';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const ALLOWED_STAFF_ROLES: Role[] = ['ADMIN', 'COORDINATOR', 'VENDOR'];

interface CreateStaffBody {
    username: string;
    password: string;
    fullName: string;
    role: Role;
}

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

    let body: CreateStaffBody;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { username, password, fullName, role } = body;

    if (!username || !password || !fullName || !role) {
        return NextResponse.json(
            { error: 'username, password, fullName, and role are all required' },
            { status: 400 },
        );
    }

    if (!ALLOWED_STAFF_ROLES.includes(role)) {
        return NextResponse.json(
            { error: `role must be one of: ${ALLOWED_STAFF_ROLES.join(', ')}` },
            { status: 400 },
        );
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const clerk = await clerkClient();
    let clerkUserId: string | null = null;

    try {
        const clerkUser = await clerk.users.createUser({
            username,
            password,
            publicMetadata: { role },
            skipPasswordChecks: false,
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