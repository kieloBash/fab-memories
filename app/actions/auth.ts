'use server'

import { AuditAction, AuditModule, logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

/**
 * Logs the LOGOUT entry BEFORE the Clerk session is destroyed — once
 * signOut() runs, auth() returns nothing and there is no actor to record.
 *
 * Call this from the client immediately before clerk.signOut().
 */
export async function recordSignOut() {
  const { userId: clerkId, sessionId } = await auth()
  if (!clerkId) return

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, email: true, role: true },
  })
  if (!user) return

  await prisma.user.update({
    where: { clerkId },
    data: { lastSessionId: null },
  })

  await logAudit({
    action: AuditAction.LOGOUT,
    module: AuditModule.AUTH,
    description: `Sign-out: ${user.email}`,
    entityType: 'User',
    entityId: user.id,
    metadata: { sessionId },
    actor: { userId: user.id, userEmail: user.email, userRole: user.role },
  })
}
