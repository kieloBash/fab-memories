// app/(pages)/(protected)/staff/admin/payments/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { usePayments, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS } from "@/features/payments";
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CreditCard, ChevronRight } from "lucide-react";
import type { PaymentStatus } from "@/app/generated/prisma/client";
import { cn } from "@/lib/utils";

type FilterStatus = PaymentStatus | "ALL";

const TABS: { value: FilterStatus; label: string }[] = [
  { value: "ALL",       label: "All" },
  { value: "SUBMITTED", label: "Pending review" },
  { value: "VERIFIED",  label: "Verified" },
  { value: "FLAGGED",   label: "Flagged" },
  { value: "PENDING",   label: "Not submitted" },
];

const fmt = (n: string | number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(Number(n));

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
    : "—";

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          {[1, 2, 3, 4, 5, 6].map((j) => (
            <TableCell key={j}>
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-primary-soft" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterStatus>("ALL");

  const { data: payments, isLoading, isError } = usePayments(
    activeTab === "ALL" ? undefined : { status: activeTab }
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="Payments"
        subtitle="Review and verify client payment submissions"
        icon={CreditCard}
      />

      {/* Tab filter bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "shrink-0 px-3.5 py-1.5 rounded-pill text-[12px] font-medium transition-all duration-150 border cursor-pointer",
              activeTab === tab.value
                ? "bg-primary text-white border-primary shadow-primary-sm"
                : "bg-white text-text-sub border-border hover:border-border-strong hover:text-text-main"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-600">
          Failed to load payments.
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows />
            ) : payments && payments.length > 0 ? (
              payments.map((payment) => (
                <TableRow
                  key={payment.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/staff/admin/payments/${payment.id}`)}
                >
                  <TableCell className="font-medium text-text-main">
                    {payment.booking.client.fullName}
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      {payment.paymentType === "DEPOSIT" ? "Deposit" : "Installment"}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-text-main">
                    {fmt(payment.amount)}
                  </TableCell>
                  <TableCell className="text-text-sub">
                    {PAYMENT_METHOD_LABELS[payment.method]}
                  </TableCell>
                  <TableCell className="text-text-sub">
                    {fmtDate(payment.submittedAt)}
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell>
                    <ChevronRight size={14} className="text-text-muted" aria-hidden="true" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-[13px] text-text-muted">
                  {activeTab === "ALL"
                    ? "No payments found."
                    : `No ${PAYMENT_STATUS_LABELS[activeTab as PaymentStatus]?.toLowerCase()} payments.`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Row count */}
      {payments && payments.length > 0 && (
        <p className="text-[12px] text-text-muted">
          Showing {payments.length} payment{payments.length !== 1 ? "s" : ""}
        </p>
      )}
    </motion.div>
  );
}
