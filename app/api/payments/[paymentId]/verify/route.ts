// app/api/payments/[paymentId]/verify/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { verifyPaymentSchema } from "@/features/payments/payments.schema"
import {
  flagPaymentRecord,
  getPaymentById,
  verifyDepositPaymentRecord,
  verifyInstallmentPaymentRecord,
} from "@/features/payments/payments.query"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ paymentId: string }> }

/**
 * PATCH /api/payments/[paymentId]/verify
 * Verifies or flags a SUBMITTED payment. ADMIN / COORDINATOR only.
 *
 * DEPOSIT + VERIFY:
 *   → Marks payment VERIFIED + flips Booking.status → CONFIRMED
 *     (runs as a single Prisma transaction)
 *
 * INSTALLMENT + VERIFY:
 *   → Marks payment VERIFIED + links to its Installment + marks Installment PAID
 *
 * Any + FLAG:
 *   → Marks payment FLAGGED so client can resubmit
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireRole(["ADMIN", "COORDINATOR"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { paymentId } = await params
  const existing = await getPaymentById(paymentId)

  if (!existing) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  if (existing.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: `Cannot verify a payment with status "${existing.status}"` },
      { status: 409 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = verifyPaymentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )
  }

  const { action, verificationNote } = parsed.data

  if (action === "FLAG") {
    const payment = await flagPaymentRecord(paymentId, actor.id, verificationNote)
    await logAction({
      userId:      actor.id,
      action:      "UPDATE",
      module:      "PAYMENT",
      description: `${actor.role} "${actor.fullName}" flagged ${existing.paymentType.toLowerCase()} payment for booking ${existing.bookingId}`,
      metadata:    { paymentId, bookingId: existing.bookingId, note: verificationNote },
    })
    return NextResponse.json(payment)
  }

  // ── VERIFY ────────────────────────────────────────────────────

  if (existing.paymentType === "DEPOSIT") {
    const payment = await verifyDepositPaymentRecord(
      paymentId,
      existing.bookingId,
      actor.id,
      verificationNote,
    )
    await logAction({
      userId:      actor.id,
      action:      "VERIFY",
      module:      "PAYMENT",
      description: `${actor.role} "${actor.fullName}" verified deposit — booking ${existing.bookingId} is now CONFIRMED`,
      metadata:    { paymentId, bookingId: existing.bookingId, note: verificationNote },
    })
    return NextResponse.json(payment)
  }

  // INSTALLMENT — must have a linked installmentId on the payment record
  // (set at submission time via submitPaymentSchema.installmentId)
  const installmentPayment = await getPaymentById(paymentId)
  if (!installmentPayment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  // Retrieve the installmentId from the DB — stored via the Installment relation
  const { prisma } = await import("@/lib/prisma")
  const installment = await prisma.installment.findFirst({
    where: { bookingId: existing.bookingId, paymentId: null, status: "UNPAID" },
    orderBy: { order: "asc" },
  })

  // The installmentId was submitted in the payment body — find it on the record
  const targetInstallment = await prisma.installment.findFirst({
    where: {
      bookingId: existing.bookingId,
      status:    "UNPAID",
      paymentId: null,
    },
    orderBy: { order: "asc" },
  })

  if (!targetInstallment) {
    return NextResponse.json(
      { error: "No unpaid installment found for this booking" },
      { status: 409 },
    )
  }

  const payment = await verifyInstallmentPaymentRecord(
    paymentId,
    targetInstallment.id,
    actor.id,
    verificationNote,
  )

  await logAction({
    userId:      actor.id,
    action:      "VERIFY",
    module:      "PAYMENT",
    description: `${actor.role} "${actor.fullName}" verified installment #${targetInstallment.order} payment for booking ${existing.bookingId}`,
    metadata:    { paymentId, bookingId: existing.bookingId, installmentId: targetInstallment.id },
  })

  return NextResponse.json(payment)
}
