// features/auth/auth.query.ts
"use server"

import { prisma } from "@/lib/prisma"
import type { CreateStaffAccountInput, UpdateStaffAccountInput } from "./auth.schema"

/**
 * Returns all non-CLIENT users, ordered newest first.
 * Used by the admin user management table.
 */
export async function getAllStaffAccounts() {
  return prisma.user.findMany({
    where: { role: { not: "CLIENT" } },
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Returns a single user by their Prisma id.
 */
export async function getStaffAccountById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  })
}

/**
 * Returns a single user by their Clerk id.
 * Used in the webhook handler and server-side auth helpers.
 */
export async function getStaffAccountByClerkId(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
  })
}

/**
 * Checks whether a username is already taken in Prisma.
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const existing = await prisma.user.findUnique({ where: { username } })
  return !!existing
}

/**
 * Mirrors a newly created Clerk user into Prisma.
 * Called after the Clerk Backend API `createUser` call succeeds.
 */
export async function createStaffAccountRecord(
  clerkId: string,
  input: CreateStaffAccountInput,
) {
  return prisma.user.create({
    data: {
      clerkId,
      username: input.username,
      fullName: input.fullName,
      role: input.role,
    },
  })
}

/**
 * Updates mutable fields on a staff account.
 * Role changes are synced to Clerk metadata by the API route handler
 * before this is called.
 */
export async function updateStaffAccountRecord(
  id: string,
  data: UpdateStaffAccountInput,
) {
  return prisma.user.update({
    where: { id },
    data: {
      fullName: data.fullName,
      role: data.role,
      isActive: data.isActive,
    },
  })
}

/**
 * Soft-deactivates a staff account — preserves audit log and event
 * history FK integrity. The Clerk user is locked by the API route
 * handler before this is called.
 */
export async function deactivateStaffAccountRecord(id: string) {
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
  })
}
