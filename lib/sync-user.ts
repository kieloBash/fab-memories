import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@/app/generated/prisma/client'
import { logAudit, AuditAction, AuditModule } from '@/lib/audit'

function toRole(value: unknown): Role {
  const r = String(value ?? '').toUpperCase()
  return r === 'ADMIN' || r === 'COORDINATOR' || r === 'VENDOR' || r === 'CLIENT'
    ? (r as Role)
    : Role.CLIENT
}

/**
 * Just-in-time mirror of the Clerk user into Postgres.
 *
 * Replaces the user.created / user.updated webhook. Called on every
 * authenticated request path that needs a local User row.
 *
 * IMPORTANT: never call this from middleware. Middleware runs on the Edge
 * runtime where Prisma's default client cannot open a TCP connection to
 * Postgres. Call it from server components, layouts, and server actions only.
 */
export async function syncCurrentUser() {
  const { userId: clerkId, sessionId } = await auth()
  if (!clerkId) return null

  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const primary =
    clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    ) ?? clerkUser.emailAddresses[0]

  if (!primary) return null

  const existing = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, email: true, role: true, lastSessionId: true },
  })

  // A session ID we have not seen before means this is a fresh sign-in.
  // This is how LOGIN gets audited without the session.created webhook.
  const isNewSession = !!sessionId && existing?.lastSessionId !== sessionId

  const data = {
    email: primary.emailAddress,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
    phone: clerkUser.phoneNumbers?.[0]?.phoneNumber ?? null,
    // Clerk publicMetadata stays the source of truth; this is the mirror.
    role: toRole(clerkUser.publicMetadata?.role),
    lastSessionId: sessionId ?? null,
    lastSyncedAt: new Date(),
    ...(isNewSession ? { lastLoginAt: new Date() } : {}),
  }

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: data,
    create: { clerkId, ...data },
  })

  const actor = { userId: user.id, userEmail: user.email, userRole: user.role }

  if (!existing) {
    await logAudit({
      action: AuditAction.CREATE,
      module: AuditModule.USER,
      description: `User account provisioned on first sign-in: ${user.email} (${user.role})`,
      entityType: 'User',
      entityId: user.id,
      actor,
    })
  }

  if (isNewSession) {
    await logAudit({
      action: AuditAction.LOGIN,
      module: AuditModule.AUTH,
      description: `Sign-in: ${user.email}`,
      entityType: 'User',
      entityId: user.id,
      metadata: { sessionId },
      actor,
    })
  }

  return user
}

/**
 * Returns the local User row, creating it if this is the first request
 * after sign-up. Use this everywhere instead of a bare findUnique.
 */
export async function ensureUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { clientProfile: true, coordinatorProfile: true },
  })

  if (user) {
    // Cheap path: row exists. Only re-sync if the session changed or the
    // mirror is stale, so we are not calling Clerk on every page render.
    const { sessionId } = await auth()
    const stale =
      !user.lastSyncedAt ||
      Date.now() - user.lastSyncedAt.getTime() > 1000 * 60 * 60

    if (user.lastSessionId !== sessionId || stale) {
      await syncCurrentUser()
      return prisma.user.findUnique({
        where: { clerkId },
        include: { clientProfile: true, coordinatorProfile: true },
      })
    }
    return user
  }

  await syncCurrentUser()
  return prisma.user.findUnique({
    where: { clerkId },
    include: { clientProfile: true, coordinatorProfile: true },
  })
}
