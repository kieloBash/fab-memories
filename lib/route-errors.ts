// lib/route-errors.ts
//
// Turns rule violations and failed audit writes into clean JSON responses.
//
//   try { ...auditedTransaction(...) } catch (err) {
//     const res = await domainErrorResponse(err, { userId: actor.id, module: "BOOKING", action: "CONFIRM", what: "confirm booking" })
//     if (res) return res
//     throw err
//   }

import type { AuditAction, AuditModule } from "@/app/generated/prisma/client"
import { logAction } from "@/lib/audit/log"
import { AuditWriteError, DomainError } from "@/lib/domain-errors"
import { NextResponse } from "next/server"

export async function domainErrorResponse(
  err: unknown,
  ctx?: { userId?: string | null; module: AuditModule; action: AuditAction; what: string; metadata?: Record<string, unknown> },
): Promise<NextResponse | null> {
  if (err instanceof AuditWriteError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
  }
  if (err instanceof DomainError) {
    // A blocked attempt is itself worth recording (best-effort — nothing was changed).
    if (ctx) {
      await logAction({
        userId: ctx.userId ?? null,
        action: ctx.action,
        module: ctx.module,
        description: `Blocked: could not ${ctx.what} — ${err.message}`,
        status: "FAILURE",
        metadata: { code: err.code, ...ctx.metadata },
      })
    }
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
  }
  return null
}

export type Attempt<T> = { ok: true; value: T } | { ok: false; response: NextResponse }

/**
 * Awaits an action and converts rule violations / audit failures into a response:
 *
 *   const r = await attempt(auditedTransaction(async (tx, audit) => {...}), { userId, module, action, what })
 *   if (!r.ok) return r.response
 *   const booking = r.value
 */
export async function attempt<T>(
  work: Promise<T>,
  ctx: { userId?: string | null; module: AuditModule; action: AuditAction; what: string; metadata?: Record<string, unknown> },
): Promise<Attempt<T>> {
  try {
    return { ok: true, value: await work }
  } catch (err) {
    const response = await domainErrorResponse(err, ctx)
    if (response) return { ok: false, response }
    throw err
  }
}
