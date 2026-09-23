import { auditChanges } from "@/lib/audit/redact"
import { updateStaffAccountSchema } from '@/features/staff-accounts/staff-accounts.schema';
import { logAction } from '@/lib/audit/log';
import { getCurrentDbUser, requireAdmin } from '@/lib/clerk/auth';
import { clerkClient } from '@/lib/clerk/client';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Would this change leave the system with ZERO active admins? Checked before any demotion or deactivation
 * of an ADMIN — there is no "override": once the last admin is gone, no one is left who can fix it.
 */
async function wouldRemoveLastAdmin(existing: { id: string; role: string; isActive: boolean }, nextRole?: string, nextActive?: boolean): Promise<boolean> {
    const losingAdminStatus = existing.role === 'ADMIN' && existing.isActive && ((nextRole !== undefined && nextRole !== 'ADMIN') || nextActive === false);
    if (!losingAdminStatus) return false;
    const otherActiveAdmins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true, id: { not: existing.id } } });
    return otherActiveAdmins === 0;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const actor = await getCurrentDbUser();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = updateStaffAccountSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Self-protection: an admin editing their OWN account here could lock themselves out with one click.
    if (id === actor.id) {
        if (parsed.data.role !== undefined && parsed.data.role !== existing.role) {
            return NextResponse.json({ error: 'You cannot change your own role.' }, { status: 400 });
        }
        if (parsed.data.isActive === false) {
            return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
        }
    }

    if (await wouldRemoveLastAdmin(existing, parsed.data.role, parsed.data.isActive)) {
        return NextResponse.json({ error: 'This is the last active admin account — promote another admin first.' }, { status: 400 });
    }

    const clerk = await clerkClient();

    // Keep Clerk metadata in sync if role changes
    if (parsed.data.role && parsed.data.role !== existing.role) {
        await clerk.users.updateUserMetadata(existing.clerkId, {
            publicMetadata: { role: parsed.data.role },
        });
    }

    // FIX: reactivating (isActive: false -> true) never told Clerk to UNLOCK the account, so a "reactivated"
    // account in our database still could not sign in — deactivate locked it, but nothing ever unlocked it.
    if (parsed.data.isActive === true && !existing.isActive) {
        await clerk.users.unlockUser(existing.clerkId).catch((err) => {
            console.error('Failed to unlock Clerk user during reactivation:', err);
        });
    }
    if (parsed.data.isActive === false && existing.isActive) {
        await clerk.users.lockUser(existing.clerkId).catch((err) => {
            console.error('Failed to lock Clerk user during deactivation:', err);
        });
    }

    const updated = await prisma.user.update({
        where: { id },
        data: {
            fullName: parsed.data.fullName,
            role: parsed.data.role,
            isActive: parsed.data.isActive,
        },
    });

    await logAction({
        userId: actor.id,
        action: 'UPDATE',
        module: 'USER_MANAGEMENT',
        description: `Admin updated an account`,
        metadata: { targetUserId: id, changes: auditChanges(parsed.data) },
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

    const actor = await getCurrentDbUser();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (id === actor.id) {
        return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
    }
    if (await wouldRemoveLastAdmin(existing, undefined, false)) {
        return NextResponse.json({ error: 'This is the last active admin account — promote another admin first.' }, { status: 400 });
    }

    const clerk = await clerkClient();
    await clerk.users.lockUser(existing.clerkId).catch((err) => {
        console.error('Failed to lock Clerk user during deactivation:', err);
    });

    const updated = await prisma.user.update({
        where: { id },
        data: { isActive: false },
    });

    await logAction({
        userId: actor.id,
        action: 'DELETE',
        module: 'USER_MANAGEMENT',
        description: `Admin deactivated an account`,
        metadata: { targetUserId: id },
    });

    return NextResponse.json(updated);
}
