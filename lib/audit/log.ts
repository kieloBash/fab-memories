// lib/audit/log.ts

import type { AuditAction, AuditModule, AuditStatus } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { computeEntryHash } from './chain';

interface LogActionParams {
    userId?: string | null;
    action: AuditAction;
    module: AuditModule;
    description: string;
    status?: AuditStatus;
    metadata?: Record<string, unknown>;
}

/**
 * Writes a single audit log entry as the next link in the tamper-evident
 * hash chain. Never throws — audit logging failures should never break
 * the underlying business operation, so errors are caught and logged to
 * console instead of propagated.
 *
 * Concurrency & chain integrity: every call takes an exclusive row lock
 * on the singleton AuditChainState row (`SELECT ... FOR UPDATE`) inside
 * a transaction before reading the current chain tip, computing the new
 * hash, and inserting. This means concurrent logAction() calls are fully
 * serialized against each other — two entries can never be created
 * against the same `previousHash`, which is exactly the condition that
 * would fork the chain and make tamper detection unreliable.
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
        await prisma.$transaction(async (tx) => {
            // Lock the chain tip. Blocks here until any other concurrent
            // logAction() call currently in this transaction commits.
            const rows = await tx.$queryRaw<{ lastHash: string | null; lastSequence: number }[]>`
        SELECT "lastHash", "lastSequence" FROM "AuditChainState" WHERE id = 1 FOR UPDATE
      `;
            const state = rows[0];
            const previousHash = state?.lastHash ?? null;
            const sequence = (state?.lastSequence ?? 0) + 1;
            const createdAt = new Date();

            // FIX: normalize metadata through a JSON round-trip BEFORE
            // hashing. JSON.stringify silently drops any key whose value
            // is `undefined` (e.g. Zod's safeParse() output for optional
            // filter fields that weren't provided) — without this, the
            // object hashed here (still containing those undefined keys)
            // would differ from what verifyAuditChainIntegrity() later
            // reads back from Postgres (where those keys were already
            // stripped on the way into the jsonb column), producing a
            // false "tampered" result despite nothing ever being altered.
            const metadataValue = JSON.parse(JSON.stringify(metadata ?? {}));

            const hash = computeEntryHash({
                sequence,
                previousHash,
                userId,
                action,
                module,
                description,
                status,
                metadata: metadataValue,
                createdAt: createdAt.toISOString(),
            });

            await tx.auditLog.create({
                data: {
                    userId,
                    action,
                    module,
                    description,
                    status,
                    metadata: metadataValue as any,
                    sequence,
                    previousHash,
                    hash,
                    createdAt,
                },
            });

            // Advance the chain tip. If AuditChainState doesn't have its
            // singleton row yet (fresh database), this creates it — the
            // very first audit entry ever written becomes the genesis
            // entry (previousHash = null).
            await tx.auditChainState.upsert({
                where: { id: 1 },
                create: { id: 1, lastHash: hash, lastSequence: sequence },
                update: { lastHash: hash, lastSequence: sequence },
            });
        });
    } catch (err) {
        console.error('Failed to write audit log:', { action, module, description }, err);
    }
}