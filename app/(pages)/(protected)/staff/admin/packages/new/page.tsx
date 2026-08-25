// app/(pages)/(protected)/(staff)/staff/admin/packages/new/page.tsx
"use client"

import type { EventType } from "@/app/generated/prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCreatePackage } from "@/features/packages"
import { ArrowLeft, Plus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "WEDDING", label: "Wedding" },
  { value: "DEBUT", label: "Debut" },
  { value: "CORPORATE", label: "Corporate Event" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "OTHER", label: "Other" },
]

export default function NewPackagePage() {
  const router = useRouter()
  const { mutate, isPending } = useCreatePackage()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [eventType, setEventType] = useState<EventType>("WEDDING")
  const [price, setPrice] = useState("")
  const [inclusions, setInclusions] = useState<string[]>([""])

  const handleInclusionChange = (index: number, value: string) => {
    setInclusions((prev) => prev.map((item, i) => (i === index ? value : item)))
  }

  const addInclusion = () => setInclusions((prev) => [...prev, ""])
  const removeInclusion = (index: number) =>
    setInclusions((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = () => {
    const cleanedInclusions = inclusions.filter((s) => s.trim().length > 0)
    mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        eventType,
        price: parseFloat(price),
        inclusions: cleanedInclusions,
        isActive: true
      },
      { onSuccess: () => router.push("/staff/admin/packages") },
    )
  }

  return (
    <div className="container max-w-xl py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 size-4" /> Back
      </Button>

      <h1 className="text-2xl font-bold">New Package</h1>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Package Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premium Wedding Package" />
        </div>

        <div className="space-y-1.5">
          <Label>Event Type</Label>
          <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Price (PHP)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this package"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Inclusions</Label>
          {inclusions.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => handleInclusionChange(index, e.target.value)}
                placeholder={`Inclusion ${index + 1}`}
              />
              {inclusions.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInclusion(index)}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addInclusion}>
            <Plus className="mr-2 size-4" /> Add Inclusion
          </Button>
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={isPending || !name.trim() || !price}
        >
          {isPending ? "Creating…" : "Create Package"}
        </Button>
      </div>
    </div>
  )
}
