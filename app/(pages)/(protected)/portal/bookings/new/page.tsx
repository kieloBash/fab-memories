// app/(pages)/(protected)/(client)/portal/bookings/new/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCreateBooking, useAvailability } from "@/features/bookings"
import { PackageSelector } from "@/features/packages/components/package-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react"
import type { Package } from "@/features/packages"
import type { EventType } from "@/app/generated/prisma/client"

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "WEDDING", label: "Wedding" },
  { value: "DEBUT", label: "Debut" },
  { value: "CORPORATE", label: "Corporate Event" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "OTHER", label: "Other" },
]

export default function NewBookingPage() {
  const router = useRouter()
  const { mutate, isPending } = useCreateBooking()

  const [eventType, setEventType] = useState<EventType>("WEDDING")
  const [eventDate, setEventDate] = useState("")
  const [venue, setVenue] = useState("")
  const [guestCount, setGuestCount] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)

  const { data: availability } = useAvailability(eventDate)

  const handleSubmit = () => {
    if (!selectedPackage || !eventDate || !venue || !guestCount) return
    mutate(
      {
        packageId: selectedPackage.id,
        eventType,
        eventDate,
        venue: venue.trim(),
        guestCount: parseInt(guestCount),
        notes: notes.trim() || undefined,
      },
      { onSuccess: () => router.push("/portal/bookings") },
    )
  }

  const isDateUnavailable = eventDate && availability && !availability.available

  return (
    <div className="container max-w-2xl py-8 space-y-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 size-4" /> Back
      </Button>

      <h1 className="text-2xl font-bold">Request a Booking</h1>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Event Type</Label>
          <Select value={eventType} onValueChange={(v) => {
            setEventType(v as EventType)
            setSelectedPackage(null)
          }}>
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
          <Label>Event Date</Label>
          <Input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
          />
          {eventDate && availability && (
            <p className={`flex items-center gap-1.5 text-sm ${isDateUnavailable ? "text-destructive" : "text-green-600"}`}>
              {isDateUnavailable ? (
                <><AlertCircle className="size-4" /> This date is already booked. Please choose another.</>
              ) : (
                <><CheckCircle2 className="size-4" /> Date is available</>
              )}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Venue</Label>
          <Input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g. Grand Ballroom, Makati City"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Number of Guests</Label>
          <Input
            type="number"
            min="1"
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            placeholder="e.g. 150"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests or details…"
            rows={3}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Select a Package</h2>
        <PackageSelector
          eventType={eventType}
          selectedId={selectedPackage?.id}
          onSelect={setSelectedPackage}
        />
      </div>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={
          isPending ||
          !selectedPackage ||
          !eventDate ||
          !venue.trim() ||
          !guestCount ||
          !!isDateUnavailable
        }
      >
        {isPending ? "Submitting…" : "Submit Booking Request"}
      </Button>
    </div>
  )
}
