// features/installments/installments.query.ts
"use server"

import { prisma } from "@/lib/prisma"

// ── Queries ───────────────────────────────────────────────────

export async function getInstallmentsByPaymentId(paymentId: string) {
  return prisma.installment.findMany({
    where: { paymentId },
    orderBy: { order: "asc" },
  })
}

export async function getInstallmentById(id: string) {
  return prisma.installment.findUnique({
    where: { id },
  })
}

// ── Mutations ─────────────────────────────────────────────────

/**
 * Generates a simple installment schedule for a payment.
 * Splits the total amount into `count` equal installments,
 * each due `intervalDays` apart starting from `startDate`.
 *
 * Called by the API route after a payment is VERIFIED, or can be
 * created manually by an admin for a booking.
 */
export async function generateInstallmentSchedule(
  paymentId: string,
  totalAmount: number,
  count: number,
  startDate: Date,
  intervalDays = 30,
) {
  const installmentAmount = parseFloat((totalAmount / count).toFixed(2))

  // Handle rounding — last installment absorbs the remainder
  const remainder = parseFloat(
    (totalAmount - installmentAmount * (count - 1)).toFixed(2),
  )

  const records = Array.from({ length: count }, (_, i) => {
    const dueDate = new Date(startDate)
    dueDate.setDate(dueDate.getDate() + intervalDays * i)

    return {
      paymentId,
      order: i + 1,
      dueDate,
      amount: i === count - 1 ? remainder : installmentAmount,
      status: "UNPAID" as const,
    }
  })

  return prisma.installment.createMany({ data: records })
}

export async function markInstallmentPaidRecord(id: string, note?: string) {
  return prisma.installment.update({
    where: { id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      note: note ?? null,
    },
  })
}
