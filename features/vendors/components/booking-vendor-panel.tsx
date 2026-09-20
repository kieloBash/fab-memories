// features/vendors/components/booking-vendor-panel.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertTriangle, CheckCircle2, Phone, MessageCircle,
  Plus, Receipt, Trash2, UserCheck,
} from "lucide-react"
import {
  useAssignVendor,
  useBookingVendors,
  useRemoveVendor,
  useUpdateBookingVendor,
  useVendorCoverage,
  useVendors,
  VENDOR_CATEGORY_ICONS,
  VENDOR_CATEGORY_LABELS,
} from "@/features/vendors"
import { CopyVendorBriefButton } from "./copy-vendor-brief-button"
import type { VendorCategory } from "@/features/vendors"
import type { BookingWithRelations } from "@/features/bookings/bookings.types"
import { cn } from "@/lib/utils"

const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" })

type Assignment = NonNullable<ReturnType<typeof useBookingVendors>["data"]>[number]

/**
 * The update endpoint REPLACES contactedAt / confirmedAt / notes — any of them
 * left out are set to null. So every update must resend the record's current
 * values, changing only the field you mean to change. (Previously "Mark
 * confirmed" sent confirmedAt alone and silently erased the contacted date
 * and the note.)
 */
const currentRecord = (bv: Assignment) => ({
  notes:       bv.notes ?? undefined,
  contactedAt: bv.contactedAt ?? undefined,
  confirmedAt: bv.confirmedAt ?? undefined,
})

interface BookingVendorPanelProps {
  booking: BookingWithRelations
}

export function BookingVendorPanel({ booking }: BookingVendorPanelProps) {
  const bookingId = booking.id

  const { data: assigned, isLoading } = useBookingVendors(bookingId)
  const { data: allVendors } = useVendors({ isActive: true })
  const { data: coverage } = useVendorCoverage(bookingId)
  const { mutate: assign, isPending: assigning } = useAssignVendor(bookingId)
  const { mutate: remove } = useRemoveVendor(bookingId)
  const { mutate: updateStatus } = useUpdateBookingVendor(bookingId)

  const [addOpen, setAddOpen] = useState(false)
  const [selectedCat, setSelectedCat] = useState<VendorCategory>("CATERING")
  const [selectedVend, setSelectedVend] = useState("")
  const [assignNote, setAssignNote] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [quoteTarget, setQuoteTarget] = useState<Assignment | null>(null)

  const requestedCategories = booking.vendorCategories ?? []

  const filteredVendors = (allVendors ?? []).filter((v) => {
    const matchCat = v.category === selectedCat
    const matchSearch = !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase())
    const notAssigned = !assigned?.some((a) => a.vendorId === v.id)
    return matchCat && matchSearch && notAssigned
  })

  const handleAssign = () => {
    if (!selectedVend) return
    assign(
      { vendorId: selectedVend, category: selectedCat, notes: assignNote.trim() || undefined },
      {
        onSuccess: () => {
          setAddOpen(false)
          setSelectedVend("")
          setAssignNote("")
          setSearchQuery("")
        },
      },
    )
  }

  const handleMarkContacted = (bv: Assignment) => {
    updateStatus({
      vendorId: bv.vendorId,
      input: { ...currentRecord(bv), contactedAt: bv.contactedAt ? undefined : new Date().toISOString() },
    })
  }

  const handleMarkConfirmed = (bv: Assignment) => {
    updateStatus({
      vendorId: bv.vendorId,
      input: { ...currentRecord(bv), confirmedAt: bv.confirmedAt ? undefined : new Date().toISOString() },
    })
  }

  /** Module 8 (FR-54) — record, change or clear the vendor's quotation. */
  const handleSaveQuotation = (bv: Assignment, amount: number | null, note: string | null) => {
    updateStatus(
      { vendorId: bv.vendorId, input: { ...currentRecord(bv), quotationAmount: amount, quotationNote: note } },
      { onSuccess: () => setQuoteTarget(null) },
    )
  }

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="text-[13px] font-semibold tracking-tight text-text-main">
            Vendor coordination
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {assigned?.length ?? 0} vendor{(assigned?.length ?? 0) !== 1 ? "s" : ""} assigned
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={
            <Button size="sm">
              <Plus size={14} aria-hidden="true" /> Add vendor
            </Button>
          }>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign vendor to booking</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Category */}
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={selectedCat}
                  onValueChange={(v) => { setSelectedCat(v as VendorCategory); setSelectedVend("") }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(VENDOR_CATEGORY_LABELS) as VendorCategory[]).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {VENDOR_CATEGORY_ICONS[cat]} {VENDOR_CATEGORY_LABELS[cat]}
                        {requestedCategories.includes(cat) && (
                          <span className="ml-2 text-[10px] text-primary font-semibold">
                            ★ Requested
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search + vendor list */}
              <div className="space-y-1.5">
                <Label>Select vendor</Label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vendors…"
                />
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {filteredVendors.length === 0 ? (
                    <p className="py-4 text-center text-[12px] text-text-muted">
                      No vendors in this category
                    </p>
                  ) : (
                    filteredVendors.map((v) => {
                      const coversArea = booking.isProvincial
                        ? v.coverageAreas.some((a) =>
                          a.toLowerCase() === "nationwide" ||
                          (booking.venueFormattedAddress ?? booking.venue)
                            .toLowerCase()
                            .includes(a.toLowerCase()),
                        )
                        : true

                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVend(v.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-primary-soft/30 transition-colors",
                            selectedVend === v.id && "bg-primary-soft",
                          )}
                        >
                          <div>
                            <p className="text-[13px] font-medium text-text-main">{v.name}</p>
                            {v.contactPhone && (
                              <p className="text-[11px] text-text-muted">
                                {v.contactChannel ?? "Phone"}: {v.contactPhone}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {selectedVend === v.id && (
                              <CheckCircle2 size={14} className="text-primary" aria-hidden="true" />
                            )}
                            {booking.isProvincial && !coversArea && (
                              <Badge variant="warning" className="text-[10px]">No coverage</Badge>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label>Note <span className="text-text-muted text-[11px]">(optional)</span></Label>
                <Textarea
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="Agreed rate, scope, special instructions…"
                  rows={2}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleAssign}
                disabled={assigning || !selectedVend}
              >
                {assigning ? "Assigning…" : "Assign vendor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Coverage warning (Suggestion 4) ── */}
      {coverage && requestedCategories.length > 0 && coverage.missing.length > 0 && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[12px] font-semibold text-amber-700">Uncovered vendor categories</p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              Client requested:{" "}
              {coverage.missing.map((cat) => (
                <span key={cat} className="font-medium">
                  {VENDOR_CATEGORY_ICONS[cat]} {VENDOR_CATEGORY_LABELS[cat]}{" "}
                </span>
              ))}
              — no confirmed vendor yet. Confirm booking anyway if you have a verbal agreement.
            </p>
          </div>
        </div>
      )}

      {/* ── Client-requested categories ── */}
      {requestedCategories.length > 0 && (
        <div className="px-5 pt-4">
          <p className="text-[11px] text-text-muted mb-2">Client needs</p>
          <div className="flex flex-wrap gap-1.5">
            {requestedCategories.map((cat) => {
              const isCovered = coverage?.covered.includes(cat)
              return (
                <span
                  key={cat}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    isCovered
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700",
                  )}
                >
                  {VENDOR_CATEGORY_ICONS[cat]} {VENDOR_CATEGORY_LABELS[cat]}
                  {isCovered && <CheckCircle2 size={11} className="text-emerald-500" aria-hidden="true" />}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Assigned vendors list ── */}
      <div className="p-4 space-y-2 mt-2">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-border/30 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && (!assigned || assigned.length === 0) && (
          <p className="py-3 text-center text-[12px] text-text-muted">
            No vendors assigned yet. Use "Add vendor" to coordinate.
          </p>
        )}

        {assigned?.map((bv) => (
          <div key={bv.id} className="rounded-xl border border-border bg-background-blush p-3 space-y-2.5">

            {/* ── Vendor name + category + remove ── */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13px] font-semibold text-text-main">
                    {bv.vendor.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {VENDOR_CATEGORY_ICONS[bv.category]} {VENDOR_CATEGORY_LABELS[bv.category]}
                  </Badge>
                </div>
                {bv.vendor.contactPhone && (
                  <a
                    href={`tel:${bv.vendor.contactPhone}`}
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5"
                  >
                    <Phone size={10} aria-hidden="true" />
                    {bv.vendor.contactPhone}
                    {bv.vendor.contactChannel && ` (${bv.vendor.contactChannel})`}
                  </a>
                )}
                {bv.notes && (
                  <p className="text-[11px] text-text-muted mt-0.5 italic">"{bv.notes}"</p>
                )}
              </div>
              <button
                onClick={() => remove(bv.vendorId)}
                className="shrink-0 text-text-muted hover:text-red-500 transition-colors p-1 -m-1"
                aria-label={`Remove ${bv.vendor.name}`}
              >
                <Trash2 size={13} />
              </button>
            </div>

            {/*
              FIX: this row previously used flex + flex-wrap with three pill
              buttons whose text (e.g. "Contacted Aug 24") could run to 20+
              characters, causing overlap/truncation on narrow screens.
              Now a 2-column grid for the status toggles (equal width, text
              never collides) with the copy-link button as a full-width row
              beneath — always readable at any viewport.
            */}
            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border">
              <button
                onClick={() => handleMarkContacted(bv)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all text-center",
                  bv.contactedAt
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-border bg-white text-text-muted hover:border-border-strong",
                )}
              >
                <MessageCircle size={11} className="shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {bv.contactedAt ? `Contacted ${fmtDateShort(bv.contactedAt)}` : "Mark contacted"}
                </span>
              </button>

              <button
                onClick={() => handleMarkConfirmed(bv)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all text-center",
                  bv.confirmedAt
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-border bg-white text-text-muted hover:border-border-strong",
                )}
              >
                <UserCheck size={11} className="shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {bv.confirmedAt ? `Confirmed ${fmtDateShort(bv.confirmedAt)}` : "Mark confirmed"}
                </span>
              </button>
            </div>

            {/* ── Quotation (Module 8 · FR-54) ── */}
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Quotation</p>
                {bv.quotationAmount !== null ? (
                  <>
                    <p className="text-[13px] font-semibold text-text-main">
                      ₱{Number(bv.quotationAmount).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </p>
                    {bv.quotationNote && <p className="truncate text-[11px] text-text-muted" title={bv.quotationNote}>{bv.quotationNote}</p>}
                  </>
                ) : (
                  <p className="text-[12px] text-text-muted">Not recorded</p>
                )}
              </div>
              <Button variant="outline" size="xs" onClick={() => setQuoteTarget(bv)}>
                <Receipt size={11} aria-hidden="true" /> {bv.quotationAmount !== null ? "Edit" : "Record"}
              </Button>
            </div>

            {/* ── Copy brief link — own row, full width, never competes for space ── */}
            <CopyVendorBriefButton
              bookingId={bookingId}
              bookingVendorId={bv.id}
              vendorName={bv.vendor.name}
              className="w-full justify-center"
            />
          </div>
        ))}
      </div>

      <QuotationDialog
        key={quoteTarget?.id ?? "closed"}
        target={quoteTarget}
        onClose={() => setQuoteTarget(null)}
        onSave={handleSaveQuotation}
      />
    </div>
  )
}

function QuotationDialog({
  target, onClose, onSave,
}: {
  target: Assignment | null
  onClose: () => void
  onSave: (bv: Assignment, amount: number | null, note: string | null) => void
}) {
  const [amount, setAmount] = useState(target?.quotationAmount !== null && target?.quotationAmount !== undefined ? String(Number(target.quotationAmount)) : "")
  const [note, setNote] = useState(target?.quotationNote ?? "")

  // Validate the TYPED TEXT, not the float: 10.12 * 100 === 1011.9999999999999 in JavaScript,
  // so arithmetic checks wrongly reject perfectly good amounts like 10.12 or 1.15.
  const trimmed = amount.trim()
  const parsed = trimmed === "" ? null : Number(trimmed)
  const error =
    trimmed === "" ? null
    : !/^\d+(\.\d+)?$/.test(trimmed) ? "Enter a valid amount (0 or more)."
    : /\.\d{3,}/.test(trimmed) ? "Use at most 2 decimal places."
    : parsed! > 99_999_999.99 ? "That amount is too large."
    : null

  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Quotation — {target?.vendor.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="quotation-amount">Amount (PHP)</Label>
            <Input
              id="quotation-amount" type="number" inputMode="decimal" min="0" step="0.01"
              value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 25000" aria-invalid={!!error}
            />
            {error && <p role="alert" className="text-[12px] text-red-600">{error}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quotation-note">Note <span className="text-[11px] text-text-muted">(optional)</span></Label>
            <Textarea id="quotation-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What the quotation covers…" />
          </div>
          <p className="text-[11px] text-text-muted">Leave the amount empty and save to clear the quotation.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" disabled={!!error || !target} onClick={() => target && onSave(target, parsed, note.trim() || null)}>Save quotation</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
