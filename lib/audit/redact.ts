// lib/audit/redact.ts
//
// PERSONAL DATA DOES NOT BELONG IN THE AUDIT TRAIL.
//
// The trail is immutable by design (hash chain + append-only database role), so anything written to it can never be
// corrected or erased. Two rules follow:
//   1. Record WHO (a user id — the audit viewer resolves the name from the User table at display time) and WHAT
//      (action, record ids, business values such as status or amount) — never contact details or free text.
//   2. Erasure works by anonymising the User row; audit entries then point at an anonymous id.
//
// This file is the safety net: writeAuditEntry() runs everything through it BEFORE hashing, so even a future call that
// forgets the rule cannot store a phone number, e-mail, note or password. Call sites should still avoid passing PII
// and should describe edits with auditChanges().

export const REDACTED = "[redacted]"

const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "")

/** Keys whose VALUE is never stored (compared after lower-casing and removing punctuation). */
const SENSITIVE_EXACT = new Set([
  "email", "phone", "mobile", "clientphone", "contactnumber", "contact",
  "address", "venue", "venueformattedaddress", "venuelatitude", "venuelongitude",
  "notes", "note", "staffnote", "verificationnote", "comment", "comments", "message",
  "reason", "cancellationreason", "cancellationrequestreason",
  "fullname", "firstname", "lastname", "username", "search", "referencenumber",
])
const SENSITIVE_SUFFIX = ["email", "phone", "password", "passwd", "token", "secret", "apikey", "authorization", "cookie", "address"]

export const isSensitiveKey = (key: string): boolean => {
  const k = norm(key)
  return SENSITIVE_EXACT.has(k) || SENSITIVE_SUFFIX.some((s) => k.endsWith(s))
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
// not inside a longer word/number, so record ids are never mangled
const PH_MOBILE = /(?<![A-Za-z0-9])(?:\+?63|0)[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{4}(?!\d)/g

/** Masks e-mail addresses and Philippine mobile numbers found inside free text. */
export const redactText = (s: string): string => s.replace(EMAIL, "[email]").replace(PH_MOBILE, "[phone]")

/** Deep copy of `value` with sensitive keys blanked and e-mail/phone patterns masked in every string. */
export function redactMetadata<T>(value: T, depth = 0): T {
  if (depth > 8) return "[truncated]" as unknown as T
  if (typeof value === "string") return redactText(value) as unknown as T
  if (Array.isArray(value)) return value.map((v) => redactMetadata(v, depth + 1)) as unknown as T
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = isSensitiveKey(k) ? REDACTED : redactMetadata(v, depth + 1)
    return out as T
  }
  return value
}

/** Business fields whose value is safe (and useful) to keep: not personal data. */
export const SAFE_CHANGE_FIELDS = new Set([
  "status", "role", "isActive", "isBackup", "isProvincial", "taskRole", "category",
  "packageId", "eventType", "paymentPlan", "paymentType", "method",
  "guestCount", "agreedPrice", "depositAmount", "amount", "quotationAmount", "order",
  "eventDate", "eventTime", "depositDueDate", "dueDate",
])

/**
 * Describes an edit without copying personal data: which fields were sent, plus the value of the business fields
 * that are safe to keep.
 *   auditChanges({ clientPhone: "0917…", notes: "call after 5", guestCount: 80 })
 *     → { fields: ["clientPhone","guestCount","notes"], values: { guestCount: 80 } }
 */
export function auditChanges(input: unknown): { fields: string[]; values: Record<string, string | number | boolean | null> } {
  const fields: string[] = []
  const values: Record<string, string | number | boolean | null> = {}
  if (input && typeof input === "object" && !Array.isArray(input)) {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (v === undefined) continue
      fields.push(k)
      if (SAFE_CHANGE_FIELDS.has(k) && (v === null || ["string", "number", "boolean"].includes(typeof v))) values[k] = v as string | number | boolean | null
    }
  }
  return { fields: fields.sort(), values }
}
