// features/installments/components/installment-schedule-form.tsx
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Zap, Lock } from "lucide-react"
import { useCreateInstallmentSchedule, useInstallments } from "../installments.hooks"
import type { InstallmentItem } from "../installments.schema"

interface InstallmentScheduleFormProps {
  bookingId: string
  packagePrice: number
  depositPaid: number
  onSuccess?: () => void
}

const today = new Date().toISOString().split("T")[0]

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n)

export function InstallmentScheduleForm({
  bookingId,
  packagePrice,
  depositPaid,
  onSuccess,
}: InstallmentScheduleFormProps) {
  const { mutate, isPending } = useCreateInstallmentSchedule(bookingId)
  const { data: existing } = useInstallments(bookingId)

  const paidInstallments = existing?.installments.filter((i) => i.status === "PAID") ?? []
  const paidCount = paidInstallments.length
  const paidAmount = paidInstallments.reduce((s, i) => s + Number(i.amount), 0)

  // Amount still to be scheduled = package − deposit − already paid installments
  const alreadyAccountedFor = depositPaid + paidAmount
  const remainingToSchedule = parseFloat(
    (packagePrice - alreadyAccountedFor).toFixed(2),
  )

  const [rows, setRows] = useState<InstallmentItem[]>([
    { order: paidCount + 1, dueDate: today, amount: remainingToSchedule > 0 ? remainingToSchedule : 0 },
  ])

  // Re-init rows if paidCount changes (e.g. after a payment is verified)
  useEffect(() => {
    setRows([
      { order: paidCount + 1, dueDate: today, amount: remainingToSchedule > 0 ? remainingToSchedule : 0 },
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paidCount])

  const totalEntered = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const unallocated = parseFloat((remainingToSchedule - totalEntered).toFixed(2))
  const isBalanced = unallocated === 0

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { order: paidCount + prev.length + 1, dueDate: today, amount: 0 },
    ])

  const removeRow = (i: number) =>
    setRows((prev) =>
      prev
        .filter((_, idx) => idx !== i)
        .map((r, idx) => ({ ...r, order: paidCount + idx + 1 })),
    )

  const updateRow = (i: number, field: keyof InstallmentItem, value: unknown) =>
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)),
    )

  const quickSplit = () => {
    if (rows.length === 0 || remainingToSchedule <= 0) return
    const perRow = parseFloat((remainingToSchedule / rows.length).toFixed(2))
    setRows((prev) =>
      prev.map((r, i) => ({
        ...r,
        amount:
          i === prev.length - 1
            ? parseFloat(
              (remainingToSchedule - perRow * (prev.length - 1)).toFixed(2),
            )
            : perRow,
      })),
    )
  }

  const handleSubmit = () => {
    mutate({ installments: rows }, { onSuccess })
  }

  return (
    <div className="space-y-5">
      {/* Locked PAID installments — read only */}
      {paidInstallments.length > 0 && (
        <div className="rounded-xl border border-border bg-background-blush overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
            <Lock size={12} className="text-text-muted" aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Paid installments (locked)
            </p>
          </div>
          <div className="divide-y divide-border">
            {paidInstallments.map((inst) => (
              <div
                key={inst.id}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[12px] text-text-muted w-5">
                    {inst.order}
                  </span>
                  <span className="text-[13px] text-text-sub">
                    {new Date(inst.dueDate).toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-text-main">
                    {fmt(Number(inst.amount))}
                  </span>
                  <Badge variant="success">Paid</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Balance summary */}
      <div className="rounded-xl border border-border bg-white divide-y divide-border overflow-hidden">
        <div className="grid grid-cols-3 gap-3 px-4 py-3 text-[13px]">
          <div>
            <p className="text-[11px] text-text-muted mb-0.5">Package total</p>
            <p className="font-semibold text-text-main">{fmt(packagePrice)}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-muted mb-0.5">Already paid</p>
            <p className="font-semibold text-emerald-600">
              − {fmt(alreadyAccountedFor)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-text-muted mb-0.5">Left to schedule</p>
            <p className="font-semibold text-primary">
              {fmt(remainingToSchedule)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5">
          <p className="text-[12px] text-text-sub">
            Entered:{" "}
            <span className="font-semibold text-text-main">
              {fmt(totalEntered)}
            </span>
          </p>
          <div
            className={
              isBalanced
                ? "text-[12px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full"
                : unallocated > 0
                  ? "text-[12px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full"
                  : "text-[12px] font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full"
            }
          >
            {isBalanced
              ? "✓ Balanced"
              : unallocated > 0
                ? `${fmt(unallocated)} unallocated`
                : `${fmt(Math.abs(unallocated))} over-allocated`}
          </div>
        </div>
      </div>

      {remainingToSchedule <= 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-[13px] font-semibold text-emerald-700">
            All payments accounted for
          </p>
          <p className="text-[12px] text-emerald-600 mt-0.5">
            The full package price has been covered by the deposit and paid
            installments.
          </p>
        </div>
      ) : (
        <>
          {/* Column labels */}
          <div className="grid grid-cols-[32px_1fr_1fr_32px] gap-2 px-1">
            <div />
            <Label className="text-[11px] uppercase tracking-widest text-text-muted">
              Due date
            </Label>
            <Label className="text-[11px] uppercase tracking-widest text-text-muted">
              Amount (PHP)
            </Label>
            <div />
          </div>

          {/* New installment rows */}
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-[32px_1fr_1fr_32px] items-center gap-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background-blush text-[12px] font-mono text-text-muted">
                  {row.order}
                </div>
                <Input
                  type="date"
                  value={row.dueDate}
                  min={today}
                  onChange={(e) => updateRow(i, "dueDate", e.target.value)}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.amount || ""}
                  onChange={(e) =>
                    updateRow(i, "amount", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  className="text-text-muted hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus size={14} aria-hidden="true" />
              Add installment
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={quickSplit}
              disabled={rows.length < 2}
              title="Split remaining balance equally"
              className="text-text-sub"
            >
              <Zap size={14} aria-hidden="true" />
              Equal split
            </Button>
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={
              isPending ||
              !isBalanced ||
              rows.some((r) => !r.dueDate || !r.amount)
            }
          >
            {isPending ? "Saving…" : "Save installment schedule"}
          </Button>
        </>
      )}
    </div>
  )
}
