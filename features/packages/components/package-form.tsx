// features/packages/components/package-form.tsx
"use client"

import type { EventType } from "@/app/generated/prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X } from "lucide-react"
import { useState } from "react"
import type { CreatePackageInput } from "../packages.schema"
import type { PackageWithBookingCount } from "../packages.types"
import { isActiveEventType } from "@/features/bookings/bookings.constants"

const EVENT_TYPES: { value: EventType | any; label: string }[] = [
  { value: "WEDDING", label: "Wedding" },
  { value: "DEBUT", label: "Debut" },
  { value: "CORPORATE", label: "Corporate Event" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "OTHER", label: "Other" },
].filter((t) => isActiveEventType(t.value))

interface PackageFormProps {
  initial?: PackageWithBookingCount
  onSubmit: (input: CreatePackageInput) => void
  isPending: boolean
  submitLabel: string
  pendingLabel: string
}

/** Shared by "New package" and "Edit package" — the only difference is the initial values and what's sent. */
export function PackageForm({ initial, onSubmit, isPending, submitLabel, pendingLabel }: PackageFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [eventType, setEventType] = useState<EventType>(initial?.eventType ?? "WEDDING")
  const [price, setPrice] = useState(initial ? String(initial.price) : "")
  const [inclusions, setInclusions] = useState<string[]>(initial?.inclusions.length ? initial.inclusions : [""])

  const handleInclusionChange = (index: number, value: string) =>
    setInclusions((prev) => prev.map((item, i) => (i === index ? value : item)))
  const addInclusion = () => setInclusions((prev) => [...prev, ""])
  const removeInclusion = (index: number) => setInclusions((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = () => {
    const cleanedInclusions = inclusions.filter((s) => s.trim().length > 0)
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      eventType: eventType as any,
      price: parseFloat(price),
      inclusions: cleanedInclusions,
      isActive: initial?.isActive ?? true,
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pkg-name">Package Name</Label>
        <Input id="pkg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premium Wedding Package" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pkg-event-type">Event Type</Label>
        <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
          <SelectTrigger id="pkg-event-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pkg-price">Price (PHP)</Label>
        <Input id="pkg-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pkg-description">Description (optional)</Label>
        <Textarea id="pkg-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this package" rows={3} />
      </div>

      <div className="space-y-2">
        <Label>Inclusions</Label>
        {inclusions.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => handleInclusionChange(index, e.target.value)}
              placeholder={`Inclusion ${index + 1}`}
              aria-label={`Inclusion ${index + 1}`}
            />
            {inclusions.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeInclusion(index)} aria-label={`Remove inclusion ${index + 1}`}>
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addInclusion}>
          <Plus className="mr-2 size-4" /> Add Inclusion
        </Button>
      </div>

      <Button className="w-full" onClick={handleSubmit} disabled={isPending || !name.trim() || !price}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </div>
  )
}
