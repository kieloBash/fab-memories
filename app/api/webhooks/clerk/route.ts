import type { Role } from '@/app/generated/prisma/client';
import { logAction } from '@/lib/audit/log';
import { clerkClient } from '@/lib/clerk/client';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { Webhook } from 'svix';

/**
 * Verifies and handles Clerk webhook events, keeping the Prisma
 * User table in sync with Clerk as the identity source of truth.
 *
 * Handles:
 *  - user.created: mirrors new user into Prisma. If no role was set
 *    in publicMetadata (i.e. a public self sign-up from /sign-up),
 *    defaults to CLIENT and writes that back to Clerk metadata.
 *  - user.updated: syncs email/username/fullName/role changes.
 *  - user.deleted: removes the Prisma row (or soft-deletes via isActive).
 */
export async function POST(req: Request) {
    const payload = await req.text();
    const headerList = await headers();
    const svixHeaders = {
        'svix-id': headerList.get('svix-id') ?? '',
        'svix-timestamp': headerList.get('svix-timestamp') ?? '',
        'svix-signature': headerList.get('svix-signature') ?? '',
    };

    if (!svixHeaders['svix-id'] || !svixHeaders['svix-signature']) {
        return new Response('Missing svix headers', { status: 400 });
    }

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SIGNING_SECRET!);

    let evt: any;
    try {
        evt = wh.verify(payload, svixHeaders);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return new Response('Invalid signature', { status: 400 });
    }

    const eventType = evt.type;
    const data = evt.data;

    try {
        switch (eventType) {
            case 'user.created': {
                const existingRole = data.public_metadata?.role as Role | undefined;
                const role: Role = existingRole ?? 'CLIENT';

                // Public self sign-ups won't have a role set yet — default them
                // to CLIENT and write it back so future session tokens carry it.
                if (!existingRole) {
                    const clerk = await clerkClient();
                    await clerk.users.updateUserMetadata(data.id, {
                        publicMetadata: { role: 'CLIENT' },
                    });
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
                break;
            }

            case 'user.deleted': {
                // Soft delete preferred — preserves audit log FK integrity.
                await prisma.user.updateMany({
                    where: { clerkId: data.id },
                    data: { isActive: false },
                });
                break;
            }

            default:
                break;
        }
    } catch (err) {
        console.error(`Failed to process webhook event ${eventType}:`, err);
        return new Response('Webhook handler error', { status: 500 });
    }

    return new Response('ok', { status: 200 });
}