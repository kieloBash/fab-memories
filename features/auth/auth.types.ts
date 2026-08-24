// features/auth/auth.types.ts

import type { Role } from "@/app/generated/prisma/client"

/**
 * Shape of a staff account as returned by /api/staff-accounts.
 * Mirrors the Prisma User model — excludes CLIENT-role users.
 */
export interface StaffAccount {
  id: string
  clerkId: string
  username: string | null
  fullName: string
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * The current authenticated user, assembled from Clerk session claims
 * (role) and the mirrored Prisma row (db fields). Used in server
 * components and layouts that need both identity and db-side data.
 */
export interface AuthUser {
  id: string
  clerkId: string
  fullName: string
  username: string | null
  email: string | null
  role: Role
  isActive: boolean
}

/**
 * Shape of Clerk's publicMetadata stored on every user.
 * Set at account creation and read back via session claims.
 */
export interface PublicMetadata {
  role: Role
}

/**
 * Custom session token claim configured in the Clerk dashboard.
 * Sessions > Customize session token: { "metadata": "{{user.public_metadata}}" }
 */
export interface AppSessionClaims {
  metadata?: PublicMetadata
}
