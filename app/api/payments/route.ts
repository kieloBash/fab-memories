// app/api/payments/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { auditedTransaction, logAction } from "@/lib/audit/log"
import { attempt } from "@/lib/route-errors"
import { deletePaymentProof } from "@/lib/storage"
import {
  submitPaymentSchema,
  paymentFilterSchema,
} from "@/features/payments/payments.schema"
import {
  createPaymentRecord,
  getAllPayments,
  getPaymentsByBookingId,
} from "@/features/payments/payments.query"
import { NextResponse } from "next/server"

/**
 * GET /api/payments
 * - ADMIN / COORDINATOR: all payments with optional ?status= / ?paymentType= / ?bookingId=
 * - CLIENT: own booking payments only — ?bookingId= required
 */
export async function GET(req: Request) {
  let role: string
  try {
    role = await requireRole(["ADMIN", "COORDINATOR", "CLIENT"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)

  if (role === "CLIENT") {
    const bookingId = searchParams.get("bookingId")
    if (!bookingId) {
      return NextResponse.json(
        { error: "?bookingId is required for client payment lookup" },
        { status: 400 },
      )
    }
    const payments = await getPaymentsByBookingId(bookingId)
    return NextResponse.json(payments)
  }

  const filters = paymentFilterSchema.safeParse({
    status:      searchParams.get("status") ?? undefined,
    paymentType: searchParams.get("paymentType") ?? undefined,
    bookingId:   searchParams.get("bookingId") ?? undefined,
  })

  const payments = await getAllPayments(filters.success ? filters.data : undefined)
  return NextResponse.json(payments)
}

/**
 * POST /api/payments
 * Submits payment proof. CLIENT only.
 *
 * The client-side hook uploads the file directly to Supabase Storage
 * and sends the resulting proofStoragePath here (not the file itself).
 *
 * If a proofStoragePath is provided but the DB write fails, the
 * uploaded file is cleaned up from storage to avoid orphaned files.
 */
export async function POST(req: Request) {
  try {
    await requireRole(["CLIENT"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = submitPaymentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )
  }

  const cleanupUpload = async () => {
    // A rejected/failed submission must not leave an orphaned proof image in storage.
    if (parsed.data.proofStoragePath) await deletePaymentProof(parsed.data.proofStoragePath)
  }

  let r_payment
  try {
    r_payment = await attempt(
      auditedTransaction(async (tx, audit) => {
        const result = await createPaymentRecord(parsed.data, tx)
        audit({
    userId: actor.id,
    action: "CREATE",
    module: "PAYMENT",
    description: `Client "${actor.fullName}" submitted ${parsed.data.paymentType.toLowerCase()} proof for booking ${parsed.data.bookingId}`,
    metadata: {
      paymentId:   result.id,
      bookingId:   parsed.data.bookingId,
      paymentType: parsed.data.paymentType,
      method:      parsed.data.method,
      amount:      parsed.data.amount,
    },
  })
        return result
      }),
      { userId: actor.id, module: "PAYMENT", action: "CREATE", what: "submit the payment proof" },
    )
  } catch (err) {
    await cleanupUpload()
    throw err
  }
  if (!r_payment.ok) {
    await cleanupUpload()
    return r_payment.response
  }
  const payment = r_payment.value

  return NextResponse.json(payment, { status: 201 })
}
