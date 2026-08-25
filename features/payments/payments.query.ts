// features/payments/payments.query.ts
"use server"

import { prisma } from "@/lib/prisma"
import { getSignedUrl } from "@/lib/storage"
import type { PaymentStatus, PaymentType } from "@/app/generated/prisma/client"
import type { SubmitPaymentInput } from "./payments.schema"

// ── Shared select ─────────────────────────────────────────────

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

// ── Signed URL helper ─────────────────────────────────────────

/**
 * Enriches a payment record with a signed URL if it has a storage path.
 * The signed URL expires after 1 hour.
 */
async function withSignedUrl<T extends { proofStoragePath: string | null }>(
  payment: T,
): Promise<T & { proofImageUrl: string | null }> {
  if (!payment.proofStoragePath) {
    return { ...payment, proofImageUrl: null }
  }
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

export async function getPaymentsByBookingId(bookingId: string) {
  const payments = await prisma.payment.findMany({
    where: { bookingId },
    include: WITH_RELATIONS,
    orderBy: { createdAt: "asc" },
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

export async function createPaymentRecord(input: SubmitPaymentInput) {
  const payment = await prisma.payment.create({
    data: {
      bookingId:        input.bookingId,
      paymentType:      input.paymentType,
      method:           input.method,
      amount:           input.amount,
      proofStoragePath: input.proofStoragePath ?? null,
      referenceNumber:  input.referenceNumber ?? null,
      status:           "SUBMITTED",
      submittedAt:      new Date(),
    },
    include: WITH_RELATIONS,
  })
  return withSignedUrl(payment)
}

/**
 * Verifies a DEPOSIT payment.
 * Runs as a Prisma transaction:
 *   1. Marks payment as VERIFIED
 *   2. Flips Booking.status → CONFIRMED
 *   3. Sets depositVerifiedAt + depositVerifiedById on the Booking
 *
 * This is the only path that confirms a booking.
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
        status:          "VERIFIED",
        verifiedById,
        verifiedAt:      new Date(),
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
 * Links the payment to its installment and marks the installment as PAID.
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
        status:    "PAID",
        paidAt:    new Date(),
        paymentId,
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
