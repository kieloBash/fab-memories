// features/installments/installments.query.ts
"use server"

import { prisma } from "@/lib/prisma"
import type { CreateInstallmentScheduleInput } from "./installments.schema"

const WITH_PAYMENT = {
  payment: {
    select: {
      id: true,
      amount: true,
      method: true,
      referenceNumber: true,
      proofStoragePath: true,
      verifiedAt: true,
    },
  },
} as const

// ── Queries ───────────────────────────────────────────────────

export async function getInstallmentsByBookingId(bookingId: string) {
  return prisma.installment.findMany({
    where: { bookingId },
    include: WITH_PAYMENT,
    orderBy: { order: "asc" },
  })
}

export async function getInstallmentById(id: string) {
  return prisma.installment.findUnique({
    where: { id },
    include: WITH_PAYMENT,
  })
}

// ── Mutations ─────────────────────────────────────────────────

/**
 * Creates the full installment schedule for a booking.
 * Called by admin after booking is confirmed and contract is agreed.
 * Replaces any existing schedule for this booking.
 */
export async function createInstallmentScheduleRecord(
  bookingId: string,
  input: CreateInstallmentScheduleInput,
) {
  return prisma.$transaction(async (tx) => {
    // Clear any existing schedule first
    await tx.installment.deleteMany({ where: { bookingId, status: "UNPAID" } })

    return tx.installment.createMany({
      data: input.installments.map((item) => ({
        bookingId,
        order:   item.order,
        dueDate: new Date(item.dueDate),
        amount:  item.amount,
        note:    item.note ?? null,
      })),
    })
  })
}
