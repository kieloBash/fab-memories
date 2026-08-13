import type { Role } from '@/app/generated/prisma/client';

/**
 * Shape of Clerk's publicMetadata for every user in this app.
 * Set on creation (staff-accounts API, seed script) and read
 * back via sessionClaims in middleware/server components.
 */
export interface PublicMetadata {
    role: Role;
}

/**
 * Shape of the custom session token claim configured in the
 * Clerk dashboard under Sessions > Customize session token:
 *   { "metadata": "{{user.public_metadata}}" }
 */
export interface AppSessionClaims {
    metadata?: PublicMetadata;
}