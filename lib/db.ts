// lib/db.ts
//
// Shared database-client types so a query function can either run on its own
// or join a caller's transaction (which is how an action and its audit entry
// are made to succeed or fail together).

import type { Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export type Tx = Prisma.TransactionClient
export type DbClient = typeof prisma | Tx

/**
 * Runs `fn` inside a transaction. If `db` is already a transaction client the
 * work simply joins it; if it is the root client a new transaction is opened.
 */
export function withTx<T>(db: DbClient, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return "$transaction" in db
    ? (db as typeof prisma).$transaction(fn, { maxWait: 5_000, timeout: 20_000 })
    : fn(db as Tx)
}
