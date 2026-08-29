// app/api/payments/[paymentId]/verify/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { verifyPaymentSchema } from "@/features/payments/payments.schema"
import {
  flagPaymentRecord,
  getPaymentById,
  verifyDepositPaymentRecord,
  verifyFullBalancePaymentRecord,
  verifyInstallmentPaymentRecord,
} from "@/features/payments/payments.query"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ paymentId: string }> }

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

  if (!existing)
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  if (existing.status !== "SUBMITTED")
    return NextResponse.json(
      { error: `Cannot verify a payment with status "${existing.status}"` },
      { status: 409 },
    )

  const body = await req.json().catch(() => ({}))
  const parsed = verifyPaymentSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )

  const { action, verificationNote } = parsed.data

  if (action === "FLAG") {
    const payment = await flagPaymentRecord(paymentId, actor.id, verificationNote)
    await logAction({
      userId: actor.id, action: "UPDATE", module: "PAYMENT",
      description: `${actor.role} "${actor.fullName}" flagged ${existing.paymentType.toLowerCase()} payment`,
      metadata: { paymentId, bookingId: existing.bookingId },
    })
    return NextResponse.json(payment)
  }

  // ── VERIFY ────────────────────────────────────────────────

  if (existing.paymentType === "DEPOSIT") {
    const payment = await verifyDepositPaymentRecord(paymentId, existing.bookingId, actor.id, verificationNote)
    await logAction({
      userId: actor.id, action: "VERIFY", module: "PAYMENT",
      description: `${actor.role} "${actor.fullName}" verified deposit — booking ${existing.bookingId} CONFIRMED`,
      metadata: { paymentId, bookingId: existing.bookingId },
    })
    return NextResponse.json(payment)
  }

  if (existing.paymentType === "FULL_BALANCE") {
    const payment = await verifyFullBalancePaymentRecord(paymentId, actor.id, verificationNote)
    await logAction({
      userId: actor.id, action: "VERIFY", module: "PAYMENT",
      description: `${actor.role} "${actor.fullName}" verified full balance payment for booking ${existing.bookingId}`,
      metadata: { paymentId, bookingId: existing.bookingId },
    })
    return NextResponse.json(payment)
  }

  // INSTALLMENT — read installmentId from payment record
  const fullPayment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { installmentId: true },
  })

  if (!fullPayment?.installmentId) {
    return NextResponse.json(
      { error: "This installment payment has no linked installment." },
      { status: 409 },
    )
  }

  const targetInstallment = await prisma.installment.findUnique({
    where: { id: fullPayment.installmentId },
    select: { id: true, order: true, status: true },
  })

  if (!targetInstallment)
    return NextResponse.json({ error: "Linked installment not found" }, { status: 409 })
  if (targetInstallment.status === "PAID")
    return NextResponse.json({ error: "This installment is already paid" }, { status: 409 })

  const payment = await verifyInstallmentPaymentRecord(
    paymentId, targetInstallment.id, actor.id, verificationNote,
  )
  await logAction({
    userId: actor.id, action: "VERIFY", module: "PAYMENT",
    description: `${actor.role} "${actor.fullName}" verified installment #${targetInstallment.order} for booking ${existing.bookingId}`,
    metadata: { paymentId, bookingId: existing.bookingId, installmentId: targetInstallment.id },
  })
  return NextResponse.json(payment)
}
