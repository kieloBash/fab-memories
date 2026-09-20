// features/payments/payments.query.ts
"use server"

import { prisma } from "@/lib/prisma"
import { getSignedUrl } from "@/lib/storage"
import type { PaymentStatus, PaymentType, Prisma } from "@/app/generated/prisma/client"
import { transitionBooking } from "@/features/bookings/bookings.transition"
import { type DbClient, type Tx, withTx } from "@/lib/db"
import { DomainError } from "@/lib/domain-errors"
import type { RecordManualPaymentInput, SubmitPaymentInput } from "./payments.schema"

const WITH_RELATIONS = {
  booking: {
    select: {
      id: true, eventType: true, eventDate: true, venue: true, status: true,
      client: { select: { id: true, fullName: true, email: true } },
    },
  },
  verifiedBy: { select: { id: true, fullName: true, role: true } },
} as const

async function withSignedUrl<T extends { proofStoragePath: string | null }>(
  payment: T,
): Promise<T & { proofImageUrl: string | null }> {
  if (!payment.proofStoragePath) return { ...payment, proofImageUrl: null }
  try {
    return { ...payment, proofImageUrl: await getSignedUrl(payment.proofStoragePath) }
  } catch {
    return { ...payment, proofImageUrl: null }
  }
}

// ── Queries ───────────────────────────────────────────────────

export async function getAllPayments(filters?: {
  status?: PaymentStatus
  paymentType?: PaymentType
  bookingId?: string
}) {
  const payments = await prisma.payment.findMany({
    where: { status: filters?.status, paymentType: filters?.paymentType, bookingId: filters?.bookingId },
    include: WITH_RELATIONS,
    orderBy: { createdAt: "desc" },
  })
  return Promise.all(payments.map(withSignedUrl))
}

export async function getPaymentsByBookingId(bookingId: string) {
  const payments = await prisma.payment.findMany({
    where: { bookingId },
    include: WITH_RELATIONS,
    orderBy: { createdAt: "desc" },
  })
  return Promise.all(payments.map(withSignedUrl))
}

export async function getPaymentById(id: string) {
  const payment = await prisma.payment.findUnique({ where: { id }, include: WITH_RELATIONS })
  if (!payment) return null
  return withSignedUrl(payment)
}

// ── Client mutations ──────────────────────────────────────────

export async function createPaymentRecord(input: SubmitPaymentInput, db: DbClient = prisma) {
  const payment = await db.payment.create({
    data: {
      bookingId:        input.bookingId,
      paymentType:      input.paymentType,
      method:           input.method,
      amount:           input.amount,
      proofStoragePath: input.proofStoragePath ?? null,
      referenceNumber:  input.referenceNumber  ?? null,
      installmentId:    input.installmentId    ?? null,
      status:           "SUBMITTED",
      submittedAt:      new Date(),
    },
    include: WITH_RELATIONS,
  })
  return withSignedUrl(payment)
}

// ── Staff verify mutations ────────────────────────────────────
//
// MODULE 9: every review is a CLAIM — "move this payment from SUBMITTED to X, but only if it is still
// SUBMITTED". Two staff clicking Verify at once can no longer both succeed (the old code read the
// status in the route, then updated in a separate step). All of these take an optional `db` so the
// route can run them inside `auditedTransaction`, making the change and its audit entry atomic.

async function reviewSubmittedPayment(
  tx: Tx,
  paymentId: string,
  status: "VERIFIED" | "FLAGGED",
  reviewerId: string,
  note?: string,
) {
  const data: Prisma.PaymentUncheckedUpdateManyInput = {
    status, verifiedById: reviewerId, verifiedAt: new Date(), verificationNote: note ?? null,
  }
  const claimed = await tx.payment.updateMany({ where: { id: paymentId, status: "SUBMITTED" }, data })
  if (claimed.count === 0) {
    throw new DomainError("PAYMENT_ALREADY_REVIEWED", "This payment has already been reviewed by someone else.", 409)
  }
  return tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: WITH_RELATIONS })
}

/**
 * Verifies a DEPOSIT payment.
 * One transaction: payment VERIFIED + booking CONFIRMED — and the confirmation goes through the
 * booking gate, so it is REFUSED (and the payment stays SUBMITTED) if another booking already holds
 * the date. The deposit is never "verified" for a booking that cannot be confirmed.
 */
export async function verifyDepositPaymentRecord(
  paymentId: string,
  bookingId: string,
  verifiedById: string,
  note?: string,
  db: DbClient = prisma,
) {
  const payment = await withTx(db, async (tx) => {
    const p = await reviewSubmittedPayment(tx, paymentId, "VERIFIED", verifiedById, note)
    await transitionBooking(tx, {
      bookingId,
      to: "CONFIRMED",
      depositVerifiedInTx: true,
      data: { depositVerifiedAt: new Date(), depositVerifiedById: verifiedById },
    })
    return p
  })
  return withSignedUrl(payment)
}

/**
 * Verifies an INSTALLMENT payment.
 * Transaction: payment VERIFIED + installment PAID.
 */
export async function verifyInstallmentPaymentRecord(
  paymentId: string,
  installmentId: string,
  verifiedById: string,
  note?: string,
  db: DbClient = prisma,
) {
  const payment = await withTx(db, async (tx) => {
    const p = await reviewSubmittedPayment(tx, paymentId, "VERIFIED", verifiedById, note)
    await tx.installment.update({ where: { id: installmentId }, data: { status: "PAID", paidAt: new Date() } })
    return p
  })
  return withSignedUrl(payment)
}

/**
 * Verifies a FULL_BALANCE payment.
 * Just marks the payment VERIFIED — no other state changes needed.
 */
export async function verifyFullBalancePaymentRecord(
  paymentId: string,
  verifiedById: string,
  note?: string,
  db: DbClient = prisma,
) {
  const payment = await withTx(db, (tx) => reviewSubmittedPayment(tx, paymentId, "VERIFIED", verifiedById, note))
  return withSignedUrl(payment)
}

export async function flagPaymentRecord(
  paymentId: string,
  verifiedById: string,
  note?: string,
  db: DbClient = prisma,
) {
  const payment = await withTx(db, (tx) => reviewSubmittedPayment(tx, paymentId, "FLAGGED", verifiedById, note))
  return withSignedUrl(payment)
}

// ── Admin manual payment ──────────────────────────────────────

/**
 * Admin records a manual payment (cash / face-to-face / walk-in).
 * Creates the payment as immediately VERIFIED — no proof needed.
 *
 *   DEPOSIT      → also confirms the booking, through the same gate as every other path
 *   INSTALLMENT  → also marks the linked installment PAID
 *   FULL_BALANCE → just records the payment as VERIFIED
 */
export async function recordManualPaymentRecord(
  input: RecordManualPaymentInput,
  recordedById: string,
  db: DbClient = prisma,
) {
  const now = new Date()
  const base = {
    bookingId:        input.bookingId,
    method:           input.method,
    amount:           input.amount,
    referenceNumber:  input.referenceNumber ?? null,
    status:           "VERIFIED" as const,
    submittedAt:      now,
    verifiedById:     recordedById,
    verifiedAt:       now,
    verificationNote: input.verificationNote ?? "Manual payment recorded by staff",
  }

  const payment = await withTx(db, async (tx) => {
    if (input.paymentType === "DEPOSIT") {
      const p = await tx.payment.create({ data: { ...base, paymentType: "DEPOSIT" }, include: WITH_RELATIONS })
      await transitionBooking(tx, {
        bookingId: input.bookingId,
        to: "CONFIRMED",
        depositVerifiedInTx: true,
        data: { depositVerifiedAt: now, depositVerifiedById: recordedById },
      })
      return p
    }

    if (input.paymentType === "INSTALLMENT") {
      if (!input.installmentId) throw new Error("installmentId required for installment payments")
      const p = await tx.payment.create({
        data: { ...base, paymentType: "INSTALLMENT", installmentId: input.installmentId },
        include: WITH_RELATIONS,
      })
      await tx.installment.update({ where: { id: input.installmentId }, data: { status: "PAID", paidAt: now } })
      return p
    }

    return tx.payment.create({ data: { ...base, paymentType: "FULL_BALANCE" }, include: WITH_RELATIONS })
  })
  return withSignedUrl(payment)
}
