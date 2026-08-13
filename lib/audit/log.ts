import type { AuditAction, AuditModule, AuditStatus } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/prisma';

interface LogActionParams {
    userId?: string | null;
    action: AuditAction;
    module: AuditModule;
    description: string;
    status?: AuditStatus;
    metadata?: Record<string, unknown>;
}

/**
 * Writes a single audit log entry. Never throws — audit logging
 * failures should never break the underlying business operation,
 * so errors are caught and logged to console instead of propagated.
 */
export async function logAction({
    userId = null,
    action,
    module,
    description,
    status = 'SUCCESS',
    metadata,
}: LogActionParams): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                module,
                description,
                status,
                metadata: metadata as any,
            },
        });
    } catch (err) {
        console.error('Failed to write audit log:', { action, module, description }, err);
    }
}