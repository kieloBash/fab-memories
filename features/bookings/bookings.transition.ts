// features/bookings/bookings.transition.ts
//
// THE ONLY place a booking's status may change (Module 9 — NFR-31 / FR-10).
//
// Four code paths used to change status on their own: the confirm PATCH, the
// "decline cancellation request" PATCH, deposit verification, and manual
// deposit recording. Only some of them checked anything. They now all call
// `transitionBooking`, which — inside the caller's transaction —
//   1. locks the booking row,
//   2. checks the transition is allowed,
//   3. for CONFIRMED: requires a VERIFIED deposit and a free date,
//   4. writes, and maps a unique-index violation to the same friendly error.
//
// The partial unique index "Booking_held_eventDate_key" is the final arbiter
// when two requests race: both may pass step 3, but only one UPDATE can win.
//
// Server-only. Not a "use server" module (that would expose these as actions).

import type { BookingStatus, Prisma } from "@/app/generated/prisma/client"
import type { Tx } from "@/lib/db"
import { DomainError } from "@/lib/domain-errors"

/** A date is "held" while a booking is confirmed OR a cancellation is awaiting a decision. */
export const HELD_STATUSES: BookingStatus[] = ["CONFIRMED", "CANCELLATION_REQUESTED"]

export const BOOKING_INCLUDE = {
  client: { select: { id: true, fullName: true, email: true, username: true } },
  package: true,
  confirmedBy: { select: { id: true, fullName: true, role: true } },
  payments: true,
} as const

/** Allowed status transitions. Nothing ever leaves CANCELLED. */
export const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING:                ["CONFIRMED", "CANCELLED"],
  CONFIRMED:              ["CANCELLATION_REQUESTED", "CANCELLED"],
  CANCELLATION_REQUESTED: ["CONFIRMED", "CANCELLED", "CANCELLATION_REQUESTED"],
  CANCELLED:              [],
}

const LABEL: Record<BookingStatus, string> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLATION_REQUESTED: "awaiting a cancellation decision",
  CANCELLED: "cancelled",
}

export interface TransitionOptions {
  bookingId: string
  to: BookingStatus
  /** Recorded as the confirming staff member when moving to CONFIRMED. */
  actorId?: string
  /**
   * True when the caller has just VERIFIED the deposit inside this same transaction
   * (deposit verification / manual deposit), so the payment table need not be re-read.
   */
  depositVerifiedInTx?: boolean
  /** Extra columns to write together with the status change. */
  data?: Prisma.BookingUncheckedUpdateInput
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as any
  return (
    e?.code === "P2002" ||
    e?.meta?.driverAdapterError?.cause?.kind === "UniqueConstraintViolation" ||
    String(e?.message ?? "").includes("Booking_held_eventDate_key")
  )
}

export const dateTakenError = () =>
  new DomainError(
    "DATE_TAKEN",
    "Another booking already holds this date (confirmed, or awaiting a cancellation decision). Resolve or decline that booking first.",
    409,
  )

export async function transitionBooking(tx: Tx, opts: TransitionOptions) {
  // 1 ── lock the row so concurrent transitions of THIS booking are serialised
  const rows = await tx.$queryRaw<{ status: BookingStatus; eventDate: Date }[]>`
    SELECT "status", "eventDate" FROM "Booking" WHERE "id" = ${opts.bookingId} FOR UPDATE
  `
  const current = rows[0]
  if (!current) throw new DomainError("BOOKING_NOT_FOUND", "Booking not found", 404)

  // 2 ── is this transition allowed at all?
  if (!ALLOWED_TRANSITIONS[current.status].includes(opts.to)) {
    throw new DomainError(
      "INVALID_STATE",
      `A booking that is ${LABEL[current.status]} cannot be changed to ${LABEL[opts.to]}.`,
      409,
    )
  }

  if (opts.to === "CONFIRMED") {
    // 3a ── no confirmation without a VERIFIED deposit (no override)
    if (!opts.depositVerifiedInTx) {
      const verified = await tx.payment.count({
        where: { bookingId: opts.bookingId, paymentType: "DEPOSIT", status: "VERIFIED" },
      })
      if (verified === 0) {
        throw new DomainError(
          "DEPOSIT_NOT_VERIFIED",
          "A verified deposit is required before a booking can be confirmed. Verify the submitted deposit, or record it under 'Record manual payment'.",
          409,
        )
      }
    }

    // 3b ── the date must not be held by anyone else
    const clash = await tx.booking.count({
      where: { id: { not: opts.bookingId }, eventDate: current.eventDate, status: { in: HELD_STATUSES } },
    })
    if (clash > 0) throw dateTakenError()
  }

  // 4 ── write; a race that slips past 3b is stopped by the partial unique index
  try {
    return await tx.booking.update({
      where: { id: opts.bookingId },
      data: {
        ...opts.data,
        status: opts.to,
        // the `confirmedBy` relation is stored in the depositVerifiedById column
        ...(opts.to === "CONFIRMED" && opts.actorId ? { depositVerifiedById: opts.actorId } : {}),
      },
      include: BOOKING_INCLUDE,
    })
  } catch (err) {
    if (isUniqueViolation(err)) throw dateTakenError()
    throw err
  }
}
