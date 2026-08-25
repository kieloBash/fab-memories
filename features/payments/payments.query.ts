// features/payments/payments.query.ts
"use server"

import { prisma } from "@/lib/prisma"
import type { PaymentStatus } from "@/app/generated/prisma/client"
import type { SubmitPaymentInput } from "./payments.schema"

const WITH_RELATIONS = {
  booking: {
    select: {
      id: true,
      eventType: true,
      eventDate: true,
      venue: true,
      client: {
        select: { id: true, fullName: true, email: true },
      },
    },
  },
  verifiedBy: {
    select: { id: true, fullName: true, role: true },
  },
} as const

// ── Queries ───────────────────────────────────────────────────

export async function getAllPayments(filters?: {
  status?: PaymentStatus
  bookingId?: string
}) {
  return prisma.payment.findMany({
    where: {
      status: filters?.status,
      bookingId: filters?.bookingId,
    },
    include: WITH_RELATIONS,
    orderBy: { createdAt: "desc" },
  })
}

export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: WITH_RELATIONS,
  })
}

export async function getPaymentsByBookingId(bookingId: string) {
  return prisma.payment.findMany({
    where: { bookingId },
    include: WITH_RELATIONS,
    orderBy: { createdAt: "asc" },
  })
}

// ── Mutations ─────────────────────────────────────────────────

export async function createPaymentRecord(input: SubmitPaymentInput) {
  return prisma.payment.create({
    data: {
      bookingId: input.bookingId,
      method: input.method,
      amount: input.amount,
      proofImageUrl: input.proofImageUrl ?? null,
      referenceNumber: input.referenceNumber ?? null,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
    include: WITH_RELATIONS,
  })
}

export async function verifyPaymentRecord(
  id: string,
  verifiedById: string,
  note?: string,
) {
  return prisma.payment.update({
    where: { id },
    data: {
      status: "VERIFIED",
      verifiedById,
      verifiedAt: new Date(),
      verificationNote: note ?? null,
    },
    include: WITH_RELATIONS,
  })
}

export async function flagPaymentRecord(
  id: string,
  verifiedById: string,
  note?: string,
) {
  return prisma.payment.update({
    where: { id },
    data: {
      status: "FLAGGED",
      verifiedById,
      verifiedAt: new Date(),
      verificationNote: note ?? null,
    },
    include: WITH_RELATIONS,
  })
}
