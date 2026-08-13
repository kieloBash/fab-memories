import { clerkClient as getClerkClient } from '@clerk/nextjs/server';

/**
 * Thin wrapper around Clerk's backend client for use inside
 * Next.js route handlers / server components / server actions.
 *
 * Usage:
 *   const clerk = await clerkClient();
 *   await clerk.users.createUser({ ... });
 */
export async function clerkClient() {
    return getClerkClient();
}