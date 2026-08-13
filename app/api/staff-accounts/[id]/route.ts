import type { Role } from '@/app/generated/prisma/client';
import { logAction } from '@/lib/audit/log';
import { getCurrentDbUser, requireAdmin } from '@/lib/clerk/auth';
import { clerkClient } from '@/lib/clerk/client';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

interface UpdateBody {
    fullName?: string;
    role?: Role;
    isActive?: boolean;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body: UpdateBody = await req.json().catch(() => ({}));

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Keep Clerk metadata in sync if role changes
    if (body.role && body.role !== existing.role) {
        const clerk = await clerkClient();
        await clerk.users.updateUserMetadata(existing.clerkId, {
            publicMetadata: { role: body.role },
        });
    }

    const updated = await prisma.user.update({
        where: { id },
        data: {
            fullName: body.fullName,
            role: body.role,
            isActive: body.isActive,
        },
    });

    const actor = await getCurrentDbUser();
    await logAction({
        userId: actor?.id,
        action: 'UPDATE',
        module: 'USER_MANAGEMENT',
        description: `Admin updated account "${existing.username}"`,
        metadata: { targetUserId: id, changes: body },
    });

    return NextResponse.json(updated);
}

/**
 * Soft-deactivate rather than hard-delete — preserves audit log FK
 * integrity and booking/event history tied to this user.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const clerk = await clerkClient();
    await clerk.users.lockUser(existing.clerkId).catch((err) => {
        console.error('Failed to lock Clerk user during deactivation:', err);
    });

    const updated = await prisma.user.update({
        where: { id },
        data: { isActive: false },
    });

    const actor = await getCurrentDbUser();
    await logAction({
        userId: actor?.id,
        action: 'DELETE',
        module: 'USER_MANAGEMENT',
        description: `Admin deactivated account "${existing.username}"`,
        metadata: { targetUserId: id },
    });

    return NextResponse.json(updated);
}