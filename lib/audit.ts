import type { Prisma } from '@/app/generated/prisma/client'
import {
  AuditAction,
  AuditModule,
  AuditStatus,
  Role,
} from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'

export { AuditAction, AuditModule, AuditStatus }

type Actor = {
  userId?: string | null
  userEmail?: string | null
  userRole?: Role | null
}

type LogAuditInput = {
  action: AuditAction
  module: AuditModule
  description: string
  status?: AuditStatus
  entityType?: string
  entityId?: string
  metadata?: Prisma.InputJsonValue
  /**
   * Supply explicitly when there is no session to read: failed logins,
   * webhook handlers, cron jobs. Otherwise resolved from the Clerk session.
   */
  actor?: Actor
}

async function resolveActor(): Promise<Actor> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return {}

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, email: true, role: true },
    })
    if (!user) return {}

    return { userId: user.id, userEmail: user.email, userRole: user.role }
  } catch {
    return {}
  }
}

async function resolveRequestContext() {
  try {
    const h = await headers()
    return {
      ipAddress:
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        h.get('x-real-ip') ??
        null,
      userAgent: h.get('user-agent'),
    }
  } catch {
    return { ipAddress: null, userAgent: null }
  }
}

/**
 * FR-48 to FR-51, NFR-33.
 *
 * Deliberately never throws. An audit write failing must not roll back the
 * business operation the user just performed — but it MUST be loud, because
 * NFR-33 claims completeness. Wire the console.error to real alerting before
 * the evaluation period, or silent gaps will appear in your Chapter 4 data.
 *
 * For operations where the log matters as much as the write (payment
 * verification, role changes), pass a transaction client via logAuditTx
 * so both succeed or neither does.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    const actor = input.actor ?? (await resolveActor())
    const ctx = await resolveRequestContext()

    await prisma.auditLog.create({
      data: {
        userId: actor.userId ?? null,
        userEmail: actor.userEmail ?? null,
        userRole: actor.userRole ?? null,
        action: input.action,
        module: input.module,
        description: input.description,
        status: input.status ?? AuditStatus.SUCCESS,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })
  } catch (err) {
    console.error('[AUDIT_WRITE_FAILED]', input.action, input.module, err)
  }
}

/**
 * Transactional variant. Use inside prisma.$transaction when the audit entry
 * must be atomic with the business write:
 *
 *   await prisma.$transaction(async (tx) => {
 *     const payment = await tx.payment.update({ ... })
 *     await logAuditTx(tx, { action: AuditAction.VERIFY, ... })
 *   })
 */
export async function logAuditTx(
  tx: Prisma.TransactionClient,
  input: LogAuditInput & { actor: Actor }
) {
  const ctx = await resolveRequestContext()

  return tx.auditLog.create({
    data: {
      userId: input.actor.userId ?? null,
      userEmail: input.actor.userEmail ?? null,
      userRole: input.actor.userRole ?? null,
      action: input.action,
      module: input.module,
      description: input.description,
      status: input.status ?? AuditStatus.SUCCESS,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
  })
}
