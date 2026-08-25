// features/payments/payments.query.ts
"use server"

import { prisma } from "@/lib/prisma"
import { getSignedUrl } from "@/lib/storage"
import type { PaymentStatus, PaymentType } from "@/app/generated/prisma/client"
import type { SubmitPaymentInput } from "./payments.schema"

// ── Relations ─────────────────────────────────────────────────

const WITH_RELATIONS = {
  booking: {
    select: {
      id: true,
      eventType: true,
      eventDate: true,
      venue: true,
      status: true,
      client: { select: { id: true, fullName: true, email: true } },
    },
  },
  verifiedBy: { select: { id: true, fullName: true, role: true } },
} as const

// ── Signed URL enrichment ─────────────────────────────────────

async function withSignedUrl<T extends { proofStoragePath: string | null }>(
  payment: T,
): Promise<T & { proofImageUrl: string | null }> {
  if (!payment.proofStoragePath) return { ...payment, proofImageUrl: null }
  try {
    const proofImageUrl = await getSignedUrl(payment.proofStoragePath)
    return { ...payment, proofImageUrl }
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
    where: {
      status:      filters?.status,
      paymentType: filters?.paymentType,
      bookingId:   filters?.bookingId,
    },
    include: WITH_RELATIONS,
    orderBy: { createdAt: "desc" },
  })
  return Promise.all(payments.map(withSignedUrl))
}

/**
 * Returns all payments for a booking ordered newest-first.
 * IMPORTANT: newest-first ordering means callers that do .find() for
 * the latest DEPOSIT or INSTALLMENT will get the most recent one,
 * not an old FLAGGED one from a previous cycle.
 */
export async function getPaymentsByBookingId(bookingId: string) {
  const payments = await prisma.payment.findMany({
    where: { bookingId },
    include: WITH_RELATIONS,
    orderBy: { createdAt: "desc" }, // FIX: was "asc" — caused stale FLAGGED deposit to appear first
  })
  return Promise.all(payments.map(withSignedUrl))
}

export async function getPaymentById(id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: WITH_RELATIONS,
  })
  if (!payment) return null
  return withSignedUrl(payment)
}

// ── Mutations ─────────────────────────────────────────────────

/**
 * Creates a payment record.
 * FIX: now stores installmentId directly on the Payment row so the
 * verify route never has to guess which installment to mark PAID.
 */
export async function createPaymentRecord(input: SubmitPaymentInput) {
  const payment = await prisma.payment.create({
    data: {
      bookingId:        input.bookingId,
      paymentType:      input.paymentType,
      method:           input.method,
      amount:           input.amount,
      proofStoragePath: input.proofStoragePath ?? null,
      referenceNumber:  input.referenceNumber ?? null,
      // Store which installment this covers (null for DEPOSIT)
      installmentId:    input.installmentId ?? null,
      status:           "SUBMITTED",
      submittedAt:      new Date(),
    },
    include: WITH_RELATIONS,
  })
  return withSignedUrl(payment)
}

/**
 * Verifies a DEPOSIT payment.
 * Single Prisma transaction:
 *   1. Payment → VERIFIED
 *   2. Booking → CONFIRMED + depositVerifiedAt/By set
 */
export async function verifyDepositPaymentRecord(
  paymentId: string,
  bookingId: string,
  verifiedById: string,
  note?: string,
) {
  const [payment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status:           "VERIFIED",
        verifiedById,
        verifiedAt:       new Date(),
        verificationNote: note ?? null,
      },
      include: WITH_RELATIONS,
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: {
        status:              "CONFIRMED",
        depositVerifiedAt:   new Date(),
        depositVerifiedById: verifiedById,
      },
    }),
  ])
  return withSignedUrl(payment)
}

/**
 * Verifies an INSTALLMENT payment.
 * Single Prisma transaction:
 *   1. Payment → VERIFIED
 *   2. Linked Installment → PAID + paidAt set
 *
 * FIX: installmentId comes directly from payment.installmentId
 * (stored at submission). No guessing via findFirst.
 */
export async function verifyInstallmentPaymentRecord(
  paymentId: string,
  installmentId: string,
  verifiedById: string,
  note?: string,
) {
  const [payment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status:           "VERIFIED",
        verifiedById,
        verifiedAt:       new Date(),
        verificationNote: note ?? null,
      },
      include: WITH_RELATIONS,
    }),
    prisma.installment.update({
      where: { id: installmentId },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    }),
  ])
  return withSignedUrl(payment)
}

export async function flagPaymentRecord(
  paymentId: string,
  verifiedById: string,
  note?: string,
) {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status:           "FLAGGED",
      verifiedById,
      verifiedAt:       new Date(),
      verificationNote: note ?? null,
    },
    include: WITH_RELATIONS,
  })
  return withSignedUrl(payment)
}
