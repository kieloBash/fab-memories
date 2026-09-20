import { processClerkEvent } from '@/lib/clerk/webhook-handler';
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
 *  - session.created: logs a LOGIN audit entry (FR-48 explicitly
 *    requires login/logout events be logged — this was previously a
 *    gap: the AuditAction.LOGIN enum value existed but nothing ever
 *    wrote it).
 *  - session.ended / session.removed: logs a LOGOUT audit entry.
 *  - user.updated with locked=true: logs an account-lockout entry (Module 9).
 *
 * The event logic itself lives in lib/clerk/webhook-handler.ts so it can be tested
 * without a Clerk signature.
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

    try {
        await processClerkEvent(evt);
    } catch (err) {
        console.error(`Failed to process webhook event ${evt.type}:`, err);
        return new Response('Webhook handler error', { status: 500 });
    }

    return new Response('ok', { status: 200 });
}
