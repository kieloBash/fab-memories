// features/bookings/booking-history.query.ts
"use server"

// Builds a booking's status timeline FROM THE AUDIT TRAIL, so there is one source of truth for "what happened
// and when" rather than a second copy of the same facts. Only SUCCESS entries are shown — a timeline is what
// happened, not what staff attempted or was blocked; blocked attempts stay on the (staff-only) audit trail page.
//
// Every label is built here, server-side, from the action code and metadata — NEVER from the audit entry's raw
// `description` text — so wording is controlled in one place and cannot drift into showing something private.
// This is intentionally the same event set for staff and for the owning client; scoping to the caller's own
// booking happens in the route (app/api/bookings/[bookingId]/history/route.ts).

import { prisma } from "@/lib/prisma"
import type { AuditAction, AuditModule, PaymentType, Role } from "@/app/generated/prisma/client"
import type { BookingHistoryEvent, BookingHistoryKind } from "./booking-history.types"

const PAYMENT_LABEL: Record<PaymentType, string> = { DEPOSIT: "Deposit", INSTALLMENT: "Installment", FULL_BALANCE: "Balance" }

function classify(
  module: AuditModule, action: AuditAction, metadata: Record<string, unknown>,
  paymentType: PaymentType | null, installmentOrder: number | null,
): { kind: BookingHistoryKind; label: string } {
  if (module === "BOOKING") {
    if (action === "CREATE") return { kind: "requested", label: "Booking requested" }
    if (action === "CONFIRM") return { kind: "confirmed", label: "Booking confirmed" }
    if (action === "DECLINE") return { kind: "cancellation_declined", label: "Cancellation request declined — booking stays confirmed" }
    if (action === "DELETE") return metadata.reasonProvided
      ? { kind: "cancelled", label: "Booking cancelled" }
      : { kind: "withdrawn", label: "Booking withdrawn" }
    if (action === "UPDATE") {
      if (metadata.reasonProvided) return { kind: "cancellation_requested", label: "Cancellation requested" }
      if ("agreedPrice" in metadata && "paymentPlan" in metadata) return { kind: "terms_updated", label: "Contract terms set" }
      return { kind: "edited", label: "Booking details updated" }
    }
  }
  if (module === "PAYMENT") {
    const what = paymentType ? PAYMENT_LABEL[paymentType] : "Payment"
    if (action === "CREATE") return paymentType === "INSTALLMENT"
      ? { kind: "installment_submitted", label: installmentOrder ? `Installment #${installmentOrder} recorded` : "Installment payment recorded" }
      : paymentType === "FULL_BALANCE"
      ? { kind: "balance_submitted", label: "Balance payment recorded" }
      : { kind: "deposit_submitted", label: "Deposit payment recorded" }
    if (action === "VERIFY") return paymentType === "INSTALLMENT"
      ? { kind: "installment_verified", label: installmentOrder ? `Installment #${installmentOrder} verified` : "Installment verified" }
      : paymentType === "FULL_BALANCE"
      ? { kind: "balance_verified", label: "Balance payment verified" }
      : { kind: "deposit_verified", label: "Deposit verified — booking confirmed" }
    if (action === "UPDATE") return { kind: "payment_flagged", label: `${what} flagged for review` }
  }
  return { kind: "other", label: `${module.toLowerCase()} ${action.toLowerCase()}` }
}

export async function getBookingHistory(bookingId: string): Promise<BookingHistoryEvent[]> {
  const entries = await prisma.auditLog.findMany({
    where: {
      module: { in: ["BOOKING", "PAYMENT"] },
      status: "SUCCESS",
      metadata: { path: ["bookingId"], equals: bookingId },
    },
    include: { user: { select: { role: true } } },
    orderBy: { sequence: "asc" },
  })
  if (entries.length === 0) return []

  // Resolve paymentType/installment order from the Payment table (durable, not personal data) — the audit
  // metadata itself only carries ids, so a payment's type never needs to be guessed or duplicated into it.
  const paymentIds = [...new Set(entries.map((e) => (e.metadata as any)?.paymentId).filter((x): x is string => typeof x === "string"))]
  const payments = paymentIds.length
    ? await prisma.payment.findMany({ where: { id: { in: paymentIds } }, select: { id: true, paymentType: true, installment: { select: { order: true } } } })
    : []
  const byPaymentId = new Map(payments.map((p) => [p.id, p]))

  return entries.map((e) => {
    const meta = (e.metadata as Record<string, unknown>) ?? {}
    const paymentId = typeof meta.paymentId === "string" ? meta.paymentId : null
    const payment = paymentId ? byPaymentId.get(paymentId) : undefined
    const { kind, label } = classify(e.module, e.action, meta, payment?.paymentType ?? null, payment?.installment?.order ?? null)
    return { id: e.id, at: e.createdAt.toISOString(), actorRole: (e.user?.role as Role | undefined) ?? null, kind, label }
  })
}
