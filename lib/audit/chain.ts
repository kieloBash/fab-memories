// lib/audit/chain.ts

import { createHash } from "crypto"

/**
 * Deterministically serializes any JSON-like value with object keys
 * sorted at every level. Two independent reasons this matters here:
 *
 * 1. Postgres's `jsonb` type reorders object keys internally on
 *    storage — even with `@db.Json` forcing plain `json` (which
 *    preserves original text), relying on storage-level ordering
 *    guarantees alone is fragile across Postgres versions/configs.
 * 2. JS object key order is normally insertion order, which varies
 *    depending on how metadata objects happen to be constructed at
 *    each call site across the app.
 *
 * Canonicalizing before hashing — on both the write path and the
 * verify path — means the hash is a function of the *logical content*
 * of the metadata, not its incidental serialization order, so it
 * can never produce a false "tampered" positive due to harmless
 * reordering.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || value === undefined) return "null"
  if (typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`

  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`)
  return `{${entries.join(",")}}`
}

export interface AuditEntryHashInput {
  sequence:     number
  previousHash: string | null
  userId:       string | null
  action:       string
  module:       string
  description:  string
  status:       string
  metadata:     unknown
  createdAt:    string // ISO 8601 — must be the exact string that gets stored
}

/**
 * Computes the SHA-256 hash for one audit log entry, chained to the
 * previous entry's hash. Every field that could conceivably be altered
 * after the fact is included in the hash input — changing ANY of them,
 * even by one character, produces a completely different hash, which
 * verifyAuditChainIntegrity() will detect on its next full-chain walk.
 *
 * Fields are joined with U+0001 (ASCII "start of heading" / unit
 * separator) rather than a printable character like "|" — this avoids
 * any theoretical ambiguity where a crafted `description` containing
 * the separator character could make two different sets of field
 * values serialize to the same joined string.
 */
export function computeEntryHash(input: AuditEntryHashInput): string {
  const SEP = "\u0001"
  const payload = [
    String(input.sequence),
    input.previousHash ?? "GENESIS",
    input.userId ?? "SYSTEM",
    input.action,
    input.module,
    input.description,
    input.status,
    canonicalStringify(input.metadata ?? {}),
    input.createdAt,
  ].join(SEP)

  return createHash("sha256").update(payload, "utf8").digest("hex")
}
