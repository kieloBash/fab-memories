// lib/clerk/webhook-handler.ts
//
// The business logic of the Clerk webhook, separated from the HTTP/signature layer so it can be tested
// with synthetic payloads (app/api/webhooks/clerk/route.ts verifies the Svix signature, then calls this).
//
// Handles:
//  - user.created  : mirror into Prisma (default role CLIENT) and audit it.
//  - user.updated  : sync profile/role; and — MODULE 9 — record an ACCOUNT LOCKOUT.
//  - user.deleted  : soft-delete (keeps audit-log FKs intact).
//  - session.created / session.ended / session.removed : LOGIN / LOGOUT audit entries (FR-48).
//
// LIMITATION (be upfront in the thesis): sign-in uses Clerk's hosted components, so a single wrong
// password never reaches this server and cannot be logged here. What Clerk DOES tell us is when an account
// becomes locked after repeated failures — that is the security-relevant event, and it is recorded.

import type { Role } from '@/app/generated/prisma/client';
import { logAction } from '@/lib/audit/log';
import { clerkClient } from '@/lib/clerk/client';
import { prisma } from '@/lib/prisma';

/** A lockout is logged at most once per user per this window (Clerk re-sends user.updated while locked). */
export const LOCKOUT_DEDUP_MINUTES = 30;

async function recordLockout(data: any, dedupMinutes: number) {
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: data.id },
        select: { id: true, fullName: true, role: true },
    });
    const who = dbUser ? `${dbUser.role}` : 'A user';
    const description = `${who} account locked after repeated failed sign-in attempts`;

    const recent = await prisma.auditLog.findFirst({
        where: {
            userId: dbUser?.id ?? null,
            action: 'LOGIN',
            module: 'AUTH',
            status: 'FAILURE',
            description,
            createdAt: { gte: new Date(Date.now() - dedupMinutes * 60_000) },
        },
        select: { id: true },
    });
    if (recent) return;

    await logAction({
        userId: dbUser?.id ?? null,
        action: 'LOGIN',
        module: 'AUTH',
        status: 'FAILURE',
        description,
        metadata: {
            event: 'ACCOUNT_LOCKED',
            clerkUserId: data.id,
            lockoutExpiresInSeconds: data.lockout_expires_in_seconds ?? null,
        },
    });
}

export async function processClerkEvent(
    evt: { type: string; data: any },
    opts: { lockoutDedupMinutes?: number } = {},
): Promise<void> {
    const eventType = evt.type;
    const data = evt.data;

    switch (eventType) {
        case 'user.created': {
            const existingRole = data.public_metadata?.role as Role | undefined;
            const role: Role = existingRole ?? 'CLIENT';

            // Public self sign-ups won't have a role set yet — default them to CLIENT and
            // write it back so future session tokens carry it.
            if (!existingRole) {
                const clerk = await clerkClient();
                await clerk.users.updateUserMetadata(data.id, { publicMetadata: { role: 'CLIENT' } });
            }

            const dbUser = await prisma.user.upsert({
                where: { clerkId: data.id },
                update: {},
                create: {
                    clerkId: data.id,
                    email: data.email_addresses?.[0]?.email_address ?? null,
                    username: data.username ?? null,
                    fullName: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || 'Unnamed User',
                    role,
                },
            });

            await logAction({
                userId: dbUser.id,
                action: 'CREATE',
                module: 'AUTH',
                description: `User account created (role: ${role})`,
                metadata: { clerkId: data.id, role },
            });
            break;
        }

        case 'user.updated': {
            const role = data.public_metadata?.role as Role | undefined;

            await prisma.user.updateMany({
                where: { clerkId: data.id },
                data: {
                    email: data.email_addresses?.[0]?.email_address ?? null,
                    username: data.username ?? null,
                    fullName: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || undefined,
                    ...(role ? { role } : {}),
                },
            });

            // MODULE 9 — account lockout after repeated failed sign-ins.
            if (data.locked === true) await recordLockout(data, opts.lockoutDedupMinutes ?? LOCKOUT_DEDUP_MINUTES);
            break;
        }

        case 'user.deleted': {
            // Soft delete preferred — preserves audit log FK integrity.
            await prisma.user.updateMany({ where: { clerkId: data.id }, data: { isActive: false } });
            break;
        }

        case 'session.created': {
            const dbUser = await prisma.user.findUnique({
                where: { clerkId: data.user_id },
                select: { id: true, fullName: true, role: true },
            });
            await logAction({
                userId: dbUser?.id ?? null,
                action: 'LOGIN',
                module: 'AUTH',
                description: dbUser ? `${dbUser.role} signed in` : 'A user signed in',
                metadata: { clerkSessionId: data.id, clerkUserId: data.user_id },
            });
            break;
        }

        // `session.ended` = normal sign-out; `session.removed` = revoked (another device, or an admin).
        case 'session.ended':
        case 'session.removed': {
            const dbUser = await prisma.user.findUnique({
                where: { clerkId: data.user_id },
                select: { id: true, fullName: true, role: true },
            });
            await logAction({
                userId: dbUser?.id ?? null,
                action: 'LOGOUT',
                module: 'AUTH',
                description: dbUser ? `${dbUser.role} signed out` : 'A user session ended',
                metadata: { clerkSessionId: data.id, clerkUserId: data.user_id, eventType },
            });
            break;
        }

        default:
            break;
    }
}
