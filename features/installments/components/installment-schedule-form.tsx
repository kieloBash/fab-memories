// features/installments/components/installment-schedule-form.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import { useCreateInstallmentSchedule } from "../installments.hooks"
import type { InstallmentItem } from "../installments.schema"

interface InstallmentScheduleFormProps {
  bookingId: string
  packagePrice: number
  onSuccess?: () => void
}

const today = new Date().toISOString().split("T")[0]

export function InstallmentScheduleForm({
  bookingId,
  packagePrice,
  onSuccess,
}: InstallmentScheduleFormProps) {
  const { mutate, isPending } = useCreateInstallmentSchedule(bookingId)

  const [rows, setRows] = useState<InstallmentItem[]>([
    { order: 1, dueDate: today, amount: packagePrice },
  ])

  const totalEntered = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const remaining    = parseFloat((packagePrice - totalEntered).toFixed(2))

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { order: prev.length + 1, dueDate: today, amount: 0 },
    ])

  const removeRow = (i: number) =>
    setRows((prev) =>
      prev
        .filter((_, idx) => idx !== i)
        .map((r, idx) => ({ ...r, order: idx + 1 })),
    )

  const updateRow = (i: number, field: keyof InstallmentItem, value: unknown) =>
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)),
    )

  const handleSubmit = () => {
    mutate({ installments: rows }, { onSuccess })
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Package price: <strong>{fmt(packagePrice)}</strong>
        </span>
        <span className={remaining !== 0 ? "text-destructive font-medium" : "text-green-600 font-medium"}>
          {remaining === 0
            ? "✓ Amounts balance"
            : remaining > 0
            ? `${fmt(remaining)} unallocated`
            : `${fmt(Math.abs(remaining))} over-allocated`}
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2">
            <div className="flex h-9 w-8 items-center justify-center rounded-md border bg-muted text-sm font-mono">
              {row.order}
            </div>

            <div className="space-y-1">
              {i === 0 && <Label className="text-xs">Due Date</Label>}
              <Input
                type="date"
                value={row.dueDate}
                min={today}
                onChange={(e) => updateRow(i, "dueDate", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              {i === 0 && <Label className="text-xs">Amount (PHP)</Label>}
              <Input
                type="number"
                min="0"
                step="0.01"
                value={row.amount || ""}
                onChange={(e) => updateRow(i, "amount", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRow(i)}
              disabled={rows.length === 1}
              className={i === 0 ? "mt-5" : ""}
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-2 size-4" /> Add Installment
      </Button>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={isPending || remaining !== 0 || rows.some((r) => !r.dueDate || !r.amount)}
      >
        {isPending ? "Saving…" : "Save Installment Schedule"}
      </Button>
    </div>
  )
}
