// features/payments/payments.query.ts
"use server"

import { prisma } from "@/lib/prisma"
import { getSignedUrl } from "@/lib/storage"
import type { PaymentStatus, PaymentType } from "@/app/generated/prisma/client"
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

export async function createPaymentRecord(input: SubmitPaymentInput) {
  const payment = await prisma.payment.create({
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

/**
 * Verifies a DEPOSIT payment.
 * Transaction: payment VERIFIED + booking CONFIRMED.
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
      data: { status: "VERIFIED", verifiedById, verifiedAt: new Date(), verificationNote: note ?? null },
      include: WITH_RELATIONS,
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED", depositVerifiedAt: new Date(), depositVerifiedById: verifiedById },
    }),
  ])
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
) {
  const [payment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: "VERIFIED", verifiedById, verifiedAt: new Date(), verificationNote: note ?? null },
      include: WITH_RELATIONS,
    }),
    prisma.installment.update({
      where: { id: installmentId },
      data: { status: "PAID", paidAt: new Date() },
    }),
  ])
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
) {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "VERIFIED", verifiedById, verifiedAt: new Date(), verificationNote: note ?? null },
    include: WITH_RELATIONS,
  })
  return withSignedUrl(payment)
}

export async function flagPaymentRecord(paymentId: string, verifiedById: string, note?: string) {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "FLAGGED", verifiedById, verifiedAt: new Date(), verificationNote: note ?? null },
    include: WITH_RELATIONS,
  })
  return withSignedUrl(payment)
}

// ── Admin manual payment ──────────────────────────────────────

/**
 * Admin records a manual payment (cash / face-to-face / walk-in).
 * Creates the payment as immediately VERIFIED — no proof needed.
 *
 * Handles all three payment types:
 *   DEPOSIT      → also confirms the booking (same as verifyDepositPaymentRecord)
 *   INSTALLMENT  → also marks the linked installment PAID
 *   FULL_BALANCE → just records the payment as VERIFIED
 */
export async function recordManualPaymentRecord(
  input: RecordManualPaymentInput,
  recordedById: string,
) {
  const now = new Date()

  if (input.paymentType === "DEPOSIT") {
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          bookingId:       input.bookingId,
          paymentType:     "DEPOSIT",
          method:          input.method,
          amount:          input.amount,
          referenceNumber: input.referenceNumber ?? null,
          status:          "VERIFIED",
          submittedAt:     now,
          verifiedById:    recordedById,
          verifiedAt:      now,
          verificationNote: input.verificationNote ?? "Manual payment recorded by staff",
        },
        include: WITH_RELATIONS,
      }),
      prisma.booking.update({
        where: { id: input.bookingId },
        data: {
          status:              "CONFIRMED",
          depositVerifiedAt:   now,
          depositVerifiedById: recordedById,
        },
      }),
    ])
    return withSignedUrl(payment)
  }

  if (input.paymentType === "INSTALLMENT") {
    if (!input.installmentId) throw new Error("installmentId required for installment payments")
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          bookingId:       input.bookingId,
          paymentType:     "INSTALLMENT",
          method:          input.method,
          amount:          input.amount,
          referenceNumber: input.referenceNumber ?? null,
          installmentId:   input.installmentId,
          status:          "VERIFIED",
          submittedAt:     now,
          verifiedById:    recordedById,
          verifiedAt:      now,
          verificationNote: input.verificationNote ?? "Manual payment recorded by staff",
        },
        include: WITH_RELATIONS,
      }),
      prisma.installment.update({
        where: { id: input.installmentId },
        data:  { status: "PAID", paidAt: now },
      }),
    ])
    return withSignedUrl(payment)
  }

  // FULL_BALANCE
  const payment = await prisma.payment.create({
    data: {
      bookingId:       input.bookingId,
      paymentType:     "FULL_BALANCE",
      method:          input.method,
      amount:          input.amount,
      referenceNumber: input.referenceNumber ?? null,
      status:          "VERIFIED",
      submittedAt:     now,
      verifiedById:    recordedById,
      verifiedAt:      now,
      verificationNote: input.verificationNote ?? "Manual payment recorded by staff",
    },
    include: WITH_RELATIONS,
  })
  return withSignedUrl(payment)
}
