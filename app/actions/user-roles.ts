'use server'

import { Role } from '@/app/generated/prisma/client'
import { AuditAction, AuditModule, AuditStatus, logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { getCurrentDbUser, requireRole } from '@/lib/roles'
import type { AppRole } from '@/types/globals'
import { clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

/**
 * FR-01 + FR-04. Writes the role to BOTH stores:
 *   Clerk publicMetadata -> read by middleware and session claims (enforcement)
 *   User.role in Postgres -> read by joins, filters, reports (querying)
 * They must not drift. Clerk is written first: if the DB write fails the
 * user is over-permissioned in exactly one place, which the mirror reveals.
 */
export async function setUserRole(targetUserId: string, newRole: AppRole) {
  await requireRole('ADMIN')
  const actorUser = await getCurrentDbUser()

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, clerkId: true, email: true, role: true },
  })
  if (!target) throw new Error('User not found')

  const previousRole = target.role

  try {
    const client = await clerkClient()
    await client.users.updateUserMetadata(target.clerkId, {
      publicMetadata: { role: newRole },
    })

    await prisma.user.update({
      where: { id: target.id },
      data: { role: newRole as Role },
    })

    await logAudit({
      action: AuditAction.ROLE_CHANGE,
      module: AuditModule.USER,
      description: `Role changed for ${target.email}: ${previousRole} -> ${newRole}`,
      entityType: 'User',
      entityId: target.id,
      metadata: { previousRole, newRole },
      actor: actorUser
        ? {
          userId: actorUser.id,
          userEmail: actorUser.email,
          userRole: actorUser.role,
        }
        : undefined,
    })

    revalidatePath('/admin/users')
    return { success: true }
  } catch (err) {
    await logAudit({
      action: AuditAction.ROLE_CHANGE,
      module: AuditModule.USER,
      description: `Failed role change for ${target.email}: ${previousRole} -> ${newRole}`,
      status: AuditStatus.FAILURE,
      entityType: 'User',
      entityId: target.id,
      actor: actorUser
        ? {
          userId: actorUser.id,
          userEmail: actorUser.email,
          userRole: actorUser.role,
        }
        : undefined,
    })
    throw err
  }
}
