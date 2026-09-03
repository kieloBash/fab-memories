// features/vendors/components/vendor-form.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, X } from "lucide-react"
import {
  VENDOR_CATEGORY_LABELS,
  VENDOR_CATEGORY_ICONS,
  CONTACT_CHANNEL_OPTIONS,
} from "../vendors.constants"
import type { CreateVendorInput } from "../vendors.schema"
import type { Vendor } from "../vendors.types"

const ALL_CATEGORIES = Object.keys(VENDOR_CATEGORY_LABELS) as (keyof typeof VENDOR_CATEGORY_LABELS)[]

const PH_COVERAGE_AREAS = [
  "Metro Manila", "Cebu", "Batangas", "Tagaytay", "Laguna",
  "Cavite", "Bulacan", "Pampanga", "Davao", "Nationwide",
]

interface VendorFormProps {
  initial?: Partial<Vendor>
  onSubmit: (data: CreateVendorInput) => void
  isPending: boolean
  submitLabel?: string
}

export function VendorForm({
  initial,
  onSubmit,
  isPending,
  submitLabel = "Save vendor",
}: VendorFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [category, setCategory] = useState(initial?.category ?? "CATERING")
  const [contactName, setContactName] = useState(initial?.contactName ?? "")
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "")
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "")
  const [contactChannel, setContactChannel] = useState(initial?.contactChannel ?? "")
  const [coverageAreas, setCoverageAreas] = useState<string[]>(initial?.coverageAreas ?? [])
  const [customArea, setCustomArea] = useState("")
  const [notes, setNotes] = useState(initial?.notes ?? "")

  const toggleArea = (area: string) =>
    setCoverageAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    )

  const addCustomArea = () => {
    const t = customArea.trim()
    if (t && !coverageAreas.includes(t)) {
      setCoverageAreas((prev) => [...prev, t])
      setCustomArea("")
    }
  }

  const handleSubmit = () => {
    if (!name.trim() || !category) return
    onSubmit({
      name: name.trim(),
      category: category as CreateVendorInput["category"],
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactChannel: contactChannel || undefined,
      coverageAreas,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="space-y-5">
      {/* Name + Category */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="vendor-name">Vendor / business name</Label>
          <Input
            id="vendor-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bloom & Petal Florals"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={(e) => setCategory(e!)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {VENDOR_CATEGORY_ICONS[cat]} {VENDOR_CATEGORY_LABELS[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contact info */}
      <div className="rounded-xl border border-border bg-background-blush p-4 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Contact information
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact-name">Contact person</Label>
            <Input
              id="contact-name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Maria Santos"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-phone">Phone / Viber number</Label>
            <Input
              id="contact-phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="09171234567"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="vendor@email.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Preferred contact channel</Label>
            <Select value={contactChannel} onValueChange={(e) => setContactChannel(e!)}>
              <SelectTrigger>
                <SelectValue placeholder="Select channel…" />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_CHANNEL_OPTIONS.map((ch) => (
                  <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Coverage areas */}
      <div className="space-y-2">
        <Label>Coverage areas</Label>
        <div className="flex flex-wrap gap-2">
          {PH_COVERAGE_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => toggleArea(area)}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-all ${coverageAreas.includes(area)
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-white text-text-sub hover:border-border-strong"
                }`}
            >
              {area}
            </button>
          ))}
        </div>
        {/* Custom area */}
        <div className="flex gap-2 mt-2">
          <Input
            value={customArea}
            onChange={(e) => setCustomArea(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomArea() } }}
            placeholder="Add other area…"
            className="max-w-[200px]"
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustomArea} disabled={!customArea.trim()}>
            <Plus size={14} aria-hidden="true" />
          </Button>
        </div>
        {/* Custom areas added */}
        {coverageAreas.filter((a) => !PH_COVERAGE_AREAS.includes(a)).map((area) => (
          <Badge key={area} variant="secondary" className="mr-1">
            {area}
            <button
              className="ml-1"
              onClick={() => setCoverageAreas((p) => p.filter((a) => a !== area))}
            >
              <X size={11} aria-label={`Remove ${area}`} />
            </button>
          </Badge>
        ))}
      </div>

      {/* Private notes */}
      <div className="space-y-1.5">
        <Label htmlFor="vendor-notes">
          Admin notes
          <span className="ml-1.5 text-[11px] text-text-muted font-normal">
            Private — rates, quality notes, special terms
          </span>
        </Label>
        <Textarea
          id="vendor-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. ₱15,000 per event, includes setup. Premium quality. Preferred for provincial events."
          rows={3}
        />
      </div>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={isPending || !name.trim()}
      >
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </div>
  )
}
