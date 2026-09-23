// app/(pages)/(protected)/staff/coordinator/availability/page.tsx
"use client"

import { motion } from "framer-motion"
import { AlertTriangle, CalendarOff, Loader2, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/ui/page-header"
import { useAddUnavailableDay, useMyUnavailableDays, useRemoveUnavailableDay } from "@/features/availability"
import { SPRING } from "@/lib/framer/framer-utils"

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function CoordinatorAvailabilityPage() {
  const [date, setDate] = useState("")
  const [reason, setReason] = useState("")
  const { data: days, isLoading, isError } = useMyUnavailableDays()
  const { mutate: add, isPending: isAdding } = useAddUnavailableDay()
  const { mutate: remove } = useRemoveUnavailableDay()

  const handleAdd = () => add({ date, reason: reason.trim() || undefined }, { onSuccess: () => { setDate(""); setReason("") } })

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="flex flex-col gap-6">
      <PageHeader title="My availability" subtitle="Mark days you cannot be assigned to an event" icon={CalendarOff} />

      <div className="rounded-xl border border-border bg-white p-5">
        <p className="mb-3 text-[13px] font-semibold text-text-main">Mark a day unavailable</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="unavail-date">Date</Label>
            <Input id="unavail-date" type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </div>
          <div className="flex-1 min-w-[180px] space-y-1.5">
            <Label htmlFor="unavail-reason">Reason (optional)</Label>
            <Input id="unavail-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Personal leave" />
          </div>
          <Button onClick={handleAdd} disabled={isAdding || !date}>
            <Plus size={14} aria-hidden="true" /> {isAdding ? "Saving…" : "Add"}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-text-muted">
          You will never be assigned to a booking on a day marked unavailable — staff must pick someone else.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white">
        <p className="border-b border-border px-5 py-3 text-[13px] font-semibold text-text-main">Your unavailable days</p>
        {isLoading && (
          <div className="flex items-center gap-2 px-5 py-6 text-[13px] text-text-muted">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Loading…
          </div>
        )}
        {isError && <p className="px-5 py-6 text-[13px] text-red-600">Couldn't load your availability.</p>}
        {days && days.length === 0 && <p className="px-5 py-6 text-[13px] text-text-muted">No unavailable days marked.</p>}
        {days && days.length > 0 && (
          <ul>
            {days.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 last:border-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-text-main">
                    {new Date(d.date + "T00:00:00").toLocaleDateString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium" })}
                  </p>
                  {d.reason && <p className="text-[12px] text-text-muted">{d.reason}</p>}
                  {d.conflictsWithAssignment && (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-600">
                      <AlertTriangle size={11} aria-hidden="true" /> You already have an assignment on this date — let an admin know.
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => remove(d.id)} aria-label={`Remove ${d.date}`}>
                  <Trash2 size={14} aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  )
}
