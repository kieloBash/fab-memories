// features/installments/installments.query.ts
"use server"

import { prisma } from "@/lib/prisma"
import type { CreateInstallmentScheduleInput } from "./installments.schema"

const WITH_PAYMENT = {
  payments: {
    select: {
      id: true,
      amount: true,
      method: true,
      referenceNumber: true,
      proofStoragePath: true,
      status: true,
      verifiedAt: true,
    },
    orderBy: { createdAt: "desc" as const },
    take: 1, // most recent payment for this installment
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
 * Creates / replaces the installment schedule for a booking.
 *
 * FIX: Previously deleted all UNPAID installments and re-created
 * from order 1 — causing duplicate order numbers when PAID installments
 * existed. Now:
 *   1. Only deletes UNPAID installments (PAID are locked in)
 *   2. New rows are numbered starting AFTER the highest PAID order
 *      so order numbers are always unique and sequential
 *   3. Input orders are re-mapped to the correct offset
 */
export async function createInstallmentScheduleRecord(
  bookingId: string,
  input: CreateInstallmentScheduleInput,
) {
  return prisma.$transaction(async (tx) => {
    // Find the highest order among PAID installments (locked in)
    const paidInstallments = await tx.installment.findMany({
      where: { bookingId, status: "PAID" },
      orderBy: { order: "desc" },
      take: 1,
      select: { order: true },
    })

    const paidOrderOffset = paidInstallments[0]?.order ?? 0

    // Delete only UNPAID installments — never touch PAID ones
    await tx.installment.deleteMany({
      where: { bookingId, status: "UNPAID" },
    })

    // Re-create with orders starting after the last PAID order
    return tx.installment.createMany({
      data: input.installments.map((item, idx) => ({
        bookingId,
        // Offset order so it never collides with PAID rows
        order:   paidOrderOffset + idx + 1,
        dueDate: new Date(item.dueDate),
        amount:  item.amount,
        note:    item.note ?? null,
      })),
    })
  })
}
