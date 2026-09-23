// test-harness/unit/audit-and-privacy.unit.test.ts
//
// Module 7 — the tamper-evident hash chain and the redaction that keeps personal data out of the (immutable) trail.
import { canonicalStringify, computeEntryHash } from "@/lib/audit/chain"
import { auditChanges, isSensitiveKey, REDACTED, redactMetadata, redactText } from "@/lib/audit/redact"
import { describe, expect, it } from "vitest"

const entry = (over: Partial<Parameters<typeof computeEntryHash>[0]> = {}) => ({
  sequence: 1, previousHash: null, userId: "u1", action: "CREATE", module: "BOOKING",
  description: "Client submitted a booking request", status: "SUCCESS", metadata: { bookingId: "b1", amount: 5 },
  createdAt: "2026-09-23T00:00:00.000Z", ...over,
})

describe("Hash chain", () => {
  it("canonical JSON ignores key order (jsonb reorders keys)", () => {
    expect(canonicalStringify({ b: 1, a: { d: [1, { z: 1, y: 2 }], c: null } })).toBe('{"a":{"c":null,"d":[1,{"y":2,"z":1}]},"b":1}')
  })
  it("the same entry always hashes the same, as 64 hex chars", () => {
    expect(computeEntryHash(entry())).toBe(computeEntryHash(entry({ metadata: { amount: 5, bookingId: "b1" } })))
    expect(computeEntryHash(entry())).toMatch(/^[0-9a-f]{64}$/)
  })
  it("changing ANY field changes the hash", () => {
    const h = computeEntryHash(entry())
    for (const over of [{ sequence: 2 }, { previousHash: "x" }, { userId: null }, { action: "DELETE" }, { module: "PAYMENT" },
      { description: "edited" }, { status: "FAILURE" }, { metadata: { bookingId: "b2", amount: 5 } }, { createdAt: "2026-09-23T00:00:00.001Z" }]) {
      expect(computeEntryHash(entry(over as any)), JSON.stringify(over)).not.toBe(h)
    }
  })
  it("a 3-entry chain verifies, and editing the middle entry is detected", () => {
    const e1 = entry({ sequence: 1 }); const h1 = computeEntryHash(e1)
    const e2 = entry({ sequence: 2, previousHash: h1, description: "Deposit verified" }); const h2 = computeEntryHash(e2)
    const e3 = entry({ sequence: 3, previousHash: h2 })
    expect(e3.previousHash).toBe(computeEntryHash(e2))
    expect(e3.previousHash).not.toBe(computeEntryHash({ ...e2, description: "Deposit verified (tampered)" }))
  })
})

describe("Redaction", () => {
  it("masks e-mails and PH mobile numbers in free text", () => {
    expect(redactText("Contact anna@example.com or 0917 123 4567 / +639171234567")).toBe("Contact [email] or [phone] / [phone]")
  })
  it("recognises sensitive keys", () => {
    for (const k of ["email", "clientPhone", "venue", "notes", "cancellationReason", "fullName", "apiKey", "contact_email", "referenceNumber"]) expect(isSensitiveKey(k), k).toBe(true)
    for (const k of ["bookingId", "amount", "status", "paymentType"]) expect(isSensitiveKey(k), k).toBe(false)
  })
  it("redacts nested metadata but keeps identifiers and amounts", () => {
    expect(redactMetadata({ bookingId: "b1", amount: 5, venue: "Home", nested: { email: "x@y.z", list: ["call 09171234567"] } }))
      .toEqual({ bookingId: "b1", amount: 5, venue: REDACTED, nested: { email: REDACTED, list: ["call [phone]"] } })
  })
  it("auditChanges lists changed fields but only keeps SAFE values", () => {
    expect(auditChanges({ guestCount: 180, notes: "secret", venue: "Home", status: undefined }))
      .toEqual({ fields: ["guestCount", "notes", "venue"], values: { guestCount: 180 } })
  })
})
