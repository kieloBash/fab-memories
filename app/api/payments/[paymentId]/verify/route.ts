// app/api/payments/[paymentId]/verify/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { verifyPaymentSchema } from "@/features/payments/payments.schema"
import {
  flagPaymentRecord,
  getPaymentById,
  verifyPaymentRecord,
} from "@/features/payments/payments.query"
import {
  generateInstallmentSchedule,
} from "@/features/installments/installments.query"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ paymentId: string }> }

/**
 * PATCH /api/payments/[paymentId]/verify
 * Verifies or flags a submitted payment. ADMIN / COORDINATOR only.
 *
 * On VERIFY: auto-generates a 3-installment schedule (30-day intervals)
 *            if no installments exist yet for this payment.
 * On FLAG:   sets status to FLAGGED so the client can resubmit.
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

  if (action === "VERIFY") {
    const payment = await verifyPaymentRecord(paymentId, actor.id, verificationNote)

    // Auto-generate 3-installment schedule on first verification
    await generateInstallmentSchedule(
      paymentId,
      Number(existing.amount),
      3,
      new Date(),
      30,
    )

    await logAction({
      userId: actor.id,
      action: "VERIFY",
      module: "PAYMENT",
      description: `${actor.role} "${actor.fullName}" verified payment for booking ${existing.bookingId}`,
      metadata: { paymentId, bookingId: existing.bookingId, note: verificationNote },
    })

    return NextResponse.json(payment)
  } else {
    const payment = await flagPaymentRecord(paymentId, actor.id, verificationNote)

    await logAction({
      userId: actor.id,
      action: "UPDATE",
      module: "PAYMENT",
      description: `${actor.role} "${actor.fullName}" flagged payment for booking ${existing.bookingId}`,
      metadata: { paymentId, bookingId: existing.bookingId, note: verificationNote },
    })

    return NextResponse.json(payment)
  }
}
