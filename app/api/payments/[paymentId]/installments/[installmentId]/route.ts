// app/api/payments/[paymentId]/installments/[installmentId]/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { markInstallmentPaidSchema } from "@/features/installments/installments.schema"
import {
  getInstallmentById,
  markInstallmentPaidRecord,
} from "@/features/installments/installments.query"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ paymentId: string; installmentId: string }> }

/**
 * PATCH /api/payments/[paymentId]/installments/[installmentId]
 * Marks an installment as paid. ADMIN / COORDINATOR only.
 * Cannot re-pay an already-paid installment.
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireRole(["ADMIN", "COORDINATOR"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { paymentId, installmentId } = await params
  const installment = await getInstallmentById(installmentId)

  if (!installment || installment.paymentId !== paymentId) {
    return NextResponse.json({ error: "Installment not found" }, { status: 404 })
  }

  if (installment.status === "PAID") {
    return NextResponse.json(
      { error: "This installment is already marked as paid" },
      { status: 409 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = markInstallmentPaidSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )
  }

  const updated = await markInstallmentPaidRecord(installmentId, parsed.data.note)

  await logAction({
    userId: actor.id,
    action: "UPDATE",
    module: "PAYMENT",
    description: `${actor.role} "${actor.fullName}" marked installment #${installment.order} as paid`,
    metadata: {
      installmentId,
      paymentId,
      order: installment.order,
      amount: installment.amount,
    },
  })

  return NextResponse.json(updated)
}
