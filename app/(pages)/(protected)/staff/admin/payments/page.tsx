// app/(pages)/(protected)/(staff)/staff/admin/payments/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePayments } from "@/features/payments"
import { PaymentSummaryCard } from "@/features/payments/components/payment-summary-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PaymentStatus } from "@/app/generated/prisma/client"
import { PAYMENT_STATUS_LABELS } from "@/features/payments"

const STATUS_OPTIONS = Object.entries(PAYMENT_STATUS_LABELS) as [PaymentStatus, string][]

export default function AdminPaymentsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<PaymentStatus | undefined>()
  const { data: payments, isLoading, isError } = usePayments(status ? { status } : undefined)

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Select
          value={status ?? "ALL"}
          onValueChange={(v) =>
            setStatus(v === "ALL" ? undefined : (v as PaymentStatus))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {STATUS_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading payments…</p>}
      {isError && <p className="text-destructive">Failed to load payments.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {payments?.map((payment) => (
          <PaymentSummaryCard
            key={payment.id}
            payment={payment}
            onClick={() => router.push(`/staff/admin/payments/${payment.id}`)}
          />
        ))}
      </div>

      {payments?.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No payments found.</p>
      )}
    </div>
  )
}
