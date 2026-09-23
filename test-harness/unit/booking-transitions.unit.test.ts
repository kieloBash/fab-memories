// test-harness/unit/booking-transitions.unit.test.ts
//
// Module 9 — the single gate every booking status change goes through (bookings.transition.ts).
// A small in-memory stand-in for the Prisma transaction lets the rules be checked without a database.
import { ALLOWED_TRANSITIONS, HELD_STATUSES, transitionBooking } from "@/features/bookings/bookings.transition"
import { DomainError } from "@/lib/domain-errors"
import { describe, expect, it, vi } from "vitest"

function fakeTx(o: { status: string; verifiedDeposits?: number; clashes?: number; uniqueViolation?: boolean }) {
  const update = vi.fn(async ({ data }: any) => {
    if (o.uniqueViolation) throw Object.assign(new Error("dup"), { code: "P2002" })
    return { id: "b1", ...data }
  })
  return {
    tx: {
      $queryRaw: vi.fn(async () => [{ status: o.status, eventDate: new Date("2090-01-01") }]),
      payment: { count: vi.fn(async () => o.verifiedDeposits ?? 0) },
      booking: { count: vi.fn(async () => o.clashes ?? 0), update },
    } as any,
    update,
  }
}

describe("Allowed transitions", () => {
  it("match the booking lifecycle", () => {
    expect(ALLOWED_TRANSITIONS).toEqual({
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["CANCELLATION_REQUESTED", "CANCELLED"],
      CANCELLATION_REQUESTED: ["CONFIRMED", "CANCELLED", "CANCELLATION_REQUESTED"],
      CANCELLED: [],
    })
    expect(HELD_STATUSES).toEqual(["CONFIRMED", "CANCELLATION_REQUESTED"])
  })
})

describe("Happy paths", () => {
  it("PENDING → CONFIRMED with a verified deposit and a free date; the confirmer is recorded", async () => {
    const { tx, update } = fakeTx({ status: "PENDING", verifiedDeposits: 1 })
    const r = await transitionBooking(tx, { bookingId: "b1", to: "CONFIRMED", actorId: "admin1" })
    expect(r).toMatchObject({ status: "CONFIRMED", depositVerifiedById: "admin1" })
    expect(update).toHaveBeenCalledOnce()
  })

  it("deposit verified in the SAME transaction → no separate deposit lookup", async () => {
    const { tx } = fakeTx({ status: "PENDING", verifiedDeposits: 0 })
    await expect(transitionBooking(tx, { bookingId: "b1", to: "CONFIRMED", depositVerifiedInTx: true })).resolves.toMatchObject({ status: "CONFIRMED" })
    expect(tx.payment.count).not.toHaveBeenCalled()
  })

  it.each([["CONFIRMED", "CANCELLATION_REQUESTED"], ["CANCELLATION_REQUESTED", "CONFIRMED"], ["CONFIRMED", "CANCELLED"], ["PENDING", "CANCELLED"]])(
    "%s → %s", async (from, to) => {
      const { tx } = fakeTx({ status: from, verifiedDeposits: 1 })
      await expect(transitionBooking(tx, { bookingId: "b1", to: to as any })).resolves.toMatchObject({ status: to })
    },
  )

  it("extra data is written together with the status", async () => {
    const { tx, update } = fakeTx({ status: "CONFIRMED" })
    await transitionBooking(tx, { bookingId: "b1", to: "CANCELLATION_REQUESTED", data: { cancellationRequestReason: "why" } })
    expect(update.mock.calls[0][0].data).toMatchObject({ status: "CANCELLATION_REQUESTED", cancellationRequestReason: "why" })
  })
})

describe("The gate refuses", () => {
  const code = async (p: Promise<unknown>) => { try { await p; return null } catch (e) { return e instanceof DomainError ? e.code : String(e) } }

  it("confirming without a verified deposit", async () => {
    expect(await code(transitionBooking(fakeTx({ status: "PENDING" }).tx, { bookingId: "b1", to: "CONFIRMED" }))).toBe("DEPOSIT_NOT_VERIFIED")
  })
  it("confirming onto a held date", async () => {
    expect(await code(transitionBooking(fakeTx({ status: "PENDING", verifiedDeposits: 1, clashes: 1 }).tx, { bookingId: "b1", to: "CONFIRMED" }))).toBe("DATE_TAKEN")
  })
  it("losing the race at the unique index", async () => {
    expect(await code(transitionBooking(fakeTx({ status: "PENDING", verifiedDeposits: 1, uniqueViolation: true }).tx, { bookingId: "b1", to: "CONFIRMED" }))).toBe("DATE_TAKEN")
  })
  it("changing a cancelled booking", async () => {
    expect(await code(transitionBooking(fakeTx({ status: "CANCELLED" }).tx, { bookingId: "b1", to: "CONFIRMED" }))).toBe("INVALID_STATE")
  })
})
