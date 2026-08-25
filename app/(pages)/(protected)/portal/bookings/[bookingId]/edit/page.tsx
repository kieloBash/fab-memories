// app/(pages)/(protected)/portal/bookings/[bookingId]/edit/page.tsx
"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useBooking, useUpdateBooking, useAvailability } from "@/features/bookings"
import { VenuePicker, type VenuePickerValue } from "@/features/bookings/components/venue-picker"
import { PackageCard } from "@/features/packages/components/package-card"
import { usePackages } from "@/features/packages"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AlertCircle, ArrowLeft, CheckCircle2, Edit3, Plus, X } from "lucide-react"
import type { EventType } from "@/app/generated/prisma/client"
import type { Package } from "@/features/packages"
import { SPRING } from "@/lib/framer/framer-utils"
import { cn } from "@/lib/utils"
import { EVENT_TYPE_LABELS } from "@/features/bookings"

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "WEDDING", label: "Wedding" },
  { value: "DEBUT", label: "Debut" },
  { value: "CORPORATE", label: "Corporate Event" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "OTHER", label: "Other" },
]

interface Props { params: Promise<{ bookingId: string }> }

export default function EditBookingPage({ params }: Props) {
  const { bookingId } = use(params)
  const router = useRouter()

  const { data: booking, isLoading } = useBooking(bookingId)
  const { mutate, isPending } = useUpdateBooking()
  const { data: packages } = usePackages(true)

  const [eventType, setEventType] = useState<EventType>("WEDDING")
  const [eventDate, setEventDate] = useState("")
  const [venue, setVenue] = useState<VenuePickerValue>({ venue: "" })
  const [guestCount, setGuestCount] = useState("")
  const [notes, setNotes] = useState("")
  const [customizations, setCustomizations] = useState<string[]>([])
  const [newCustomization, setNewCustomization] = useState("")
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Initialize form from existing booking
  useEffect(() => {
    if (booking && !initialized) {
      setEventType(booking.eventType)
      setEventDate(booking.eventDate.split("T")[0])
      setVenue({
        venue: booking.venue,
        venueLatitude: booking.venueLatitude ?? undefined,
        venueLongitude: booking.venueLongitude ?? undefined,
        venueFormattedAddress: booking.venueFormattedAddress ?? undefined,
      })
      setGuestCount(String(booking.guestCount))
      setNotes(booking.notes ?? "")
      setCustomizations(booking.packageCustomizations ?? [])
      setInitialized(true)
    }
  }, [booking, initialized])

  // Set selected package from packages list
  useEffect(() => {
    if (booking && packages && !selectedPackage) {
      const found = packages.find((p) => p.id === booking.packageId)
      if (found) setSelectedPackage(found)
    }
  }, [booking, packages, selectedPackage])

  const { data: availability } = useAvailability(eventDate)
  const isDateUnavailable = !!(
    eventDate &&
    eventDate !== booking?.eventDate.split("T")[0] &&
    availability &&
    !availability.available
  )

  const filteredPackages = packages?.filter((p) => p.eventType === eventType) ?? []

  const addCustomization = () => {
    const t = newCustomization.trim()
    if (t && !customizations.includes(t)) {
      setCustomizations((prev) => [...prev, t])
      setNewCustomization("")
    }
  }

  const handleSubmit = () => {
    if (!eventDate || !venue.venue || !guestCount) return
    mutate(
      {
        id: bookingId,
        input: {
          packageId: selectedPackage?.id,
          eventType,
          eventDate,
          venue: venue.venue,
          venueLatitude: venue.venueLatitude,
          venueLongitude: venue.venueLongitude,
          venueFormattedAddress: venue.venueFormattedAddress,
          guestCount: parseInt(guestCount),
          notes: notes.trim() || undefined,
          packageCustomizations: customizations,
          isProvincial: venue.isProvincial,
        },
      },
      { onSuccess: () => router.push(`/portal/bookings/${bookingId}`) },
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-white animate-pulse" />
        ))}
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-[13px] text-red-600">
        Booking not found.
      </div>
    )
  }

  if (booking.status !== "PENDING") {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
          <ArrowLeft size={15} aria-hidden="true" /> Back
        </Button>
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800">Cannot edit this booking</p>
            <p className="text-[13px] text-amber-700 mt-0.5">
              Only pending bookings can be edited. This booking is currently{" "}
              <strong>{booking.status}</strong>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6 max-w-2xl"
    >
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
        <ArrowLeft size={15} aria-hidden="true" /> Back
      </Button>

      <PageHeader
        title="Edit booking"
        subtitle={`${EVENT_TYPE_LABELS[booking.eventType]} · ${booking.venue}`}
        icon={Edit3}
      />

      <div className="flex flex-col gap-5">
        {/* Event type */}
        <div className="space-y-2">
          <Label>Event type</Label>
          <Select value={eventType} onValueChange={(v) => { setEventType(v as EventType); setSelectedPackage(null) }}>
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

        {/* Date */}
        <div className="space-y-2">
          <Label>Event date</Label>
          <Input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
          />
          {isDateUnavailable && (
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-red-600">
              <AlertCircle size={13} aria-hidden="true" />
              This date is already booked. Please choose another.
            </p>
          )}
          {eventDate && availability?.available && eventDate !== booking.eventDate.split("T")[0] && (
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-600">
              <CheckCircle2 size={13} aria-hidden="true" />
              Date is available
            </p>
          )}
        </div>

        {/* Venue */}
        <VenuePicker value={venue} onChange={setVenue} />

        {/* Guest count */}
        <div className="space-y-2">
          <Label>Estimated guest count</Label>
          <Input
            type="number" min="1" max="10000"
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
          />
        </div>

        {/* Package */}
        <div className="space-y-2">
          <Label>Service package</Label>
          {filteredPackages.length === 0 ? (
            <p className="text-[13px] text-text-muted">No packages for this event type.</p>
          ) : (
            <div className="grid gap-3">
              {filteredPackages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  selected={selectedPackage?.id === pkg.id}
                  onSelect={setSelectedPackage}
                  isProvincial={venue.isProvincial}
                />
              ))}
            </div>
          )}
        </div>

        {/* Customizations */}
        <div className="space-y-2">
          <Label>
            Package customizations
            <span className="ml-1 text-text-muted text-[11px]">(optional)</span>
          </Label>
          <div className="flex gap-2">
            <Input
              value={newCustomization}
              onChange={(e) => setNewCustomization(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomization() } }}
              placeholder="Add a customization…"
            />
            <Button type="button" variant="outline" onClick={addCustomization} disabled={!newCustomization.trim()}>
              <Plus size={14} aria-hidden="true" />
            </Button>
          </div>
          {customizations.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {customizations.map((c) => (
                <span
                  key={c}
                  className="flex items-center gap-1 rounded-pill border border-border bg-background-blush px-2.5 py-1 text-[12px] text-text-sub"
                >
                  {c}
                  <button onClick={() => setCustomizations((prev) => prev.filter((x) => x !== c))}>
                    <X size={11} className="text-text-muted hover:text-red-500" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes <span className="text-text-muted text-[11px]">(optional)</span></Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special requests, theme, dietary needs…"
            rows={3}
          />
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={isPending || !eventDate || !venue.venue || !guestCount || isDateUnavailable}
        >
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </motion.div>
  )
}
