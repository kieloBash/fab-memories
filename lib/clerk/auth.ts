import type { Role } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';
import type { AppSessionClaims } from './types';

/**
 * Returns the current session's role, read straight from the
 * session token claim (no network call). Returns null if signed out
 * or if metadata hasn't propagated yet (e.g. immediately after
 * account creation, before the JWT refreshes).
 */
export async function getCurrentRole(): Promise<Role | null> {
    const { sessionClaims } = await auth();
    const claims = sessionClaims as AppSessionClaims | null;
    return claims?.metadata?.role ?? null;
}

/**
 * Returns the current Clerk userId, or null if signed out.
 */
export async function getCurrentClerkId(): Promise<string | null> {
    const { userId } = await auth();
    return userId;
}

/**
 * Returns the current user's mirrored Prisma row.
 * Use this when you need DB-side fields (id, fullName, isActive, etc.),
 * not just the role.
 */
export async function getCurrentDbUser() {
    const { userId } = await auth();
    if (!userId) return null;

    return prisma.user.findUnique({
        where: { clerkId: userId },
    });
}

/**
 * Returns the full Clerk user object (profile, twoFactorEnabled, etc.).
 * Slower (network call) — only use when you need Clerk-specific fields
 * not mirrored in Prisma, e.g. checking MFA enrollment status.
 */
export async function getCurrentClerkUser() {
    return currentUser();
}

/**
 * Throws if there is no signed-in user, or if the signed-in user's
 * role is not in `allowedRoles`. Use at the top of server components,
 * route handlers, or server actions that need hard role enforcement
 * beyond what middleware already covers.
 */
export async function requireRole(allowedRoles: Role[]): Promise<Role> {
    const role = await getCurrentRole();

    if (!role) {
        throw new Error('UNAUTHENTICATED');
    }

    if (!allowedRoles.includes(role)) {
        throw new Error('FORBIDDEN');
    }

    return role;
}

/**
 * Same as requireRole, but for a single role — the common case
 * (e.g. requireRole(['ADMIN']) vs requireAdmin()).
 */
export async function requireAdmin(): Promise<void> {
    await requireRole(['ADMIN']);
}