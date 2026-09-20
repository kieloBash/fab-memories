// lib/audit/log.ts

import type { AuditAction, AuditModule, AuditStatus } from '@/app/generated/prisma/client';
import { AuditWriteError } from '@/lib/domain-errors';
import type { Tx } from '@/lib/db';
import { prisma } from '@/lib/prisma';
import { computeEntryHash } from './chain';

export interface AuditEntryInput {
    userId?: string | null;
    action: AuditAction;
    module: AuditModule;
    description: string;
    status?: AuditStatus;
    metadata?: Record<string, unknown>;
}

/**
 * Writes ONE audit entry as the next link of the hash chain, inside the
 * caller's transaction. THROWS on any failure.
 *
 * Concurrency & chain integrity: takes an exclusive row lock on the singleton
 * AuditChainState row (`SELECT ... FOR UPDATE`) before reading the chain tip,
 * so two entries can never be created against the same `previousHash`
 * (which would fork the chain). The lock is held until the surrounding
 * transaction commits — which is why `auditedTransaction` writes its audit
 * entries LAST, after the business writes, keeping the lock window short and
 * ruling out lock-order deadlocks.
 */
export async function writeAuditEntry(tx: Tx, entry: AuditEntryInput): Promise<void> {
    const userId = entry.userId ?? null;
    const status = entry.status ?? 'SUCCESS';

    const rows = await tx.$queryRaw<{ lastHash: string | null; lastSequence: number }[]>`
        SELECT "lastHash", "lastSequence" FROM "AuditChainState" WHERE id = 1 FOR UPDATE
    `;
    const state = rows[0];
    const previousHash = state?.lastHash ?? null;
    const sequence = (state?.lastSequence ?? 0) + 1;
    const createdAt = new Date();

    // Normalise metadata through a JSON round-trip BEFORE hashing: JSON.stringify drops
    // keys whose value is `undefined`, and Postgres jsonb would drop them on the way in —
    // hashing the un-normalised object would later look like tampering.
    const metadataValue = JSON.parse(JSON.stringify(entry.metadata ?? {}));

    const hash = computeEntryHash({
        sequence,
        previousHash,
        userId,
        action: entry.action,
        module: entry.module,
        description: entry.description,
        status,
        metadata: metadataValue,
        createdAt: createdAt.toISOString(),
    });

    await tx.auditLog.create({
        data: {
            userId,
            action: entry.action,
            module: entry.module,
            description: entry.description,
            status,
            metadata: metadataValue as any,
            sequence,
            previousHash,
            hash,
            createdAt,
        },
    });

    // Advance the chain tip (creates the singleton row on a fresh database).
    await tx.auditChainState.upsert({
        where: { id: 1 },
        create: { id: 1, lastHash: hash, lastSequence: sequence },
        update: { lastHash: hash, lastSequence: sequence },
    });
}

/**
 * Durable record of an audit write that failed. Deliberately outside the hash
 * chain and outside any business transaction — it has to survive precisely when
 * the audit write does not. Never throws.
 */
export async function recordAuditFailure(entry: AuditEntryInput, error: unknown, attempts: number): Promise<void> {
    try {
        await prisma.auditWriteFailure.create({
            data: {
                userId: entry.userId ?? null,
                action: entry.action,
                module: entry.module,
                description: entry.description.slice(0, 1000),
                error: String((error as any)?.message ?? error).slice(0, 1000),
                attempts,
            },
        });
    } catch (persistErr) {
        // Last resort — the log line is all that is left.
        console.error('AUDIT WRITE FAILURE COULD NOT BE PERSISTED', { entry, error, persistErr });
    }
}

/**
 * ATOMIC audit: runs `fn` and the audit entries it queues in ONE transaction.
 * If the audit write fails, the business change is rolled back and an
 * `AuditWriteError` (HTTP 503) is thrown — no state-changing action can succeed
 * without leaving a record (NFR-33).
 *
 *   const booking = await auditedTransaction(async (tx, audit) => {
 *     const b = await confirmBookingRecord(id, actor.id, tx)
 *     audit({ userId: actor.id, action: 'CONFIRM', module: 'BOOKING', description: '…' })
 *     return b
 *   })
 *
 * Business errors thrown by `fn` (e.g. a DomainError) pass through untouched.
 */
export async function auditedTransaction<T>(
    fn: (tx: Tx, audit: (entry: AuditEntryInput) => void) => Promise<T>,
): Promise<T> {
    const queued: AuditEntryInput[] = [];
    let auditFailed = false;
    let auditError: unknown;

    try {
        return await prisma.$transaction(
            async (tx) => {
                const result = await fn(tx, (entry) => queued.push(entry));
                try {
                    for (const entry of queued) await writeAuditEntry(tx, entry);
                } catch (err) {
                    auditFailed = true;
                    auditError = err;
                    throw err; // aborts the transaction → the business change rolls back too
                }
                return result;
            },
            { maxWait: 5_000, timeout: 20_000 },
        );
    } catch (err) {
        if (auditFailed) {
            for (const entry of queued) await recordAuditFailure(entry, auditError, 1);
            throw new AuditWriteError(auditError);
        }
        throw err;
    }
}

/**
 * BEST-EFFORT audit for actions whose state change lives outside our database
 * (Clerk account changes, e-mail…) or that only record an attempt/view.
 * Retries once; if it still fails the failure is persisted to AuditWriteFailure
 * (surfaced by the dashboard risk engine) — it is never silently lost.
 * Never throws.
 */
export async function logAction(params: AuditEntryInput): Promise<void> {
    const MAX_ATTEMPTS = 2;
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            await prisma.$transaction((tx) => writeAuditEntry(tx, params));
            return;
        } catch (err) {
            lastError = err;
            if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 75));
        }
    }
    console.error('Failed to write audit log:', { action: params.action, module: params.module }, lastError);
    await recordAuditFailure(params, lastError, MAX_ATTEMPTS);
}
