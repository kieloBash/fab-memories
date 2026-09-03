// app/(pages)/(protected)/portal/bookings/new/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useCreateBooking, useAvailability } from "@/features/bookings"
import { VenuePicker, type VenuePickerValue } from "@/features/bookings/components/venue-picker"
import { PackageCard } from "@/features/packages/components/package-card"
import { usePackages } from "@/features/packages"
import { VendorCategoryPicker } from "@/features/vendors/components/vendor-category-picker"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft, ArrowRight, CalendarHeart,
  AlertCircle, CheckCircle2, Plus, X, Phone,
} from "lucide-react"
import type { EventType } from "@/app/generated/prisma/client"
import type { Package } from "@/features/packages"
import type { VendorCategory } from "@/features/vendors"
import { VENDOR_CATEGORY_ICONS, VENDOR_CATEGORY_LABELS } from "@/features/vendors"
import { SPRING } from "@/lib/framer/framer-utils"
import { cn } from "@/lib/utils"

const EVENT_TYPES: { value: EventType; label: string; emoji: string }[] = [
  { value: "WEDDING",   label: "Wedding",         emoji: "💍" },
  { value: "DEBUT",     label: "Debut",           emoji: "🌸" },
  { value: "CORPORATE", label: "Corporate Event", emoji: "🏢" },
  { value: "BIRTHDAY",  label: "Birthday",        emoji: "🎂" },
  { value: "OTHER",     label: "Other",           emoji: "✨" },
]

const STEPS = ["Event details", "Choose a package", "Review"] as const
type Step = 0 | 1 | 2

export default function NewBookingPage() {
  const router = useRouter()
  const { mutate, isPending } = useCreateBooking()

  const [step, setStep]           = useState<Step>(0)
  const [eventType, setEventType] = useState<EventType>("WEDDING")
  const [eventDate, setEventDate] = useState("")
  const [venue, setVenue]         = useState<VenuePickerValue>({ venue: "" })
  const [guestCount, setGuestCount] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [notes, setNotes]         = useState("")
  const [customizations, setCustomizations] = useState<string[]>([])
  const [newCustomization, setNewCustomization] = useState("")
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([])
  const [selectedPackage, setSelectedPackage]   = useState<Package | null>(null)

  const { data: availability } = useAvailability(eventDate)
  const { data: packages }     = usePackages(true)

  const filteredPackages = packages?.filter((p) => p.eventType === eventType) ?? []
  const isDateUnavailable = !!(eventDate && availability && !availability.available)

  // Phone validation
  const phoneValid = /^(\+63|0)9\d{9}$/.test(clientPhone)
  const phoneError = clientPhone.length > 0 && !phoneValid

  const step0Valid =
    !!eventDate && !isDateUnavailable &&
    !!venue.venue.trim() && !!guestCount &&
    phoneValid

  const canSubmit = step0Valid && !!selectedPackage

  const addCustomization = () => {
    const t = newCustomization.trim()
    if (t && !customizations.includes(t)) {
      setCustomizations((prev) => [...prev, t])
      setNewCustomization("")
    }
  }

  const handleSubmit = () => {
    if (!selectedPackage || !eventDate || !venue.venue || !guestCount || !clientPhone) return
    mutate(
      {
        packageId:             selectedPackage.id,
        eventType,
        eventDate,
        venue:                 venue.venue,
        venueLatitude:         venue.venueLatitude,
        venueLongitude:        venue.venueLongitude,
        venueFormattedAddress: venue.venueFormattedAddress,
        guestCount:            parseInt(guestCount),
        clientPhone,
        notes:                 notes.trim() || undefined,
        packageCustomizations: customizations,
        vendorCategories,
        isProvincial:          venue.isProvincial,
      },
      { onSuccess: () => router.push("/portal/bookings") },
    )
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(n)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6 max-w-2xl"
    >
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 w-fit">
        <ArrowLeft size={15} aria-hidden="true" /> Back
      </Button>

      <PageHeader
        title="New booking"
        subtitle="Fill in your event details and select a service package"
        icon={CalendarHeart}
      />

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-0 flex-1 last:flex-none">
            <button
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors",
                step === i ? "bg-primary-soft text-primary"
                : i < step  ? "text-emerald-600"
                : "text-text-muted",
              )}
              onClick={() => { if (i < step || (i === 1 && step0Valid)) setStep(i as Step) }}
            >
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                step === i  ? "bg-primary text-white"
                : i < step ? "bg-emerald-500 text-white"
                : "bg-border text-text-muted",
              )}>
                {i < step ? "✓" : i + 1}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn("flex-1 h-px mx-1", i < step ? "bg-emerald-300" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Step 0: Event details ─────────────────────────── */}
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={SPRING}
            className="flex flex-col gap-5"
          >
            {/* Event type */}
            <div className="space-y-2">
              <Label>Event type</Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {EVENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { setEventType(t.value); setSelectedPackage(null) }}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border p-3 text-[12px] font-medium transition-all",
                      eventType === t.value
                        ? "border-primary bg-primary-soft text-primary shadow-primary-sm"
                        : "border-border bg-white text-text-sub hover:border-border-strong",
                    )}
                  >
                    <span className="text-[20px]">{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
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
              <AnimatePresence>
                {eventDate && availability && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={cn(
                      "flex items-center gap-1.5 text-[12px] font-medium",
                      isDateUnavailable ? "text-red-600" : "text-emerald-600",
                    )}
                  >
                    {isDateUnavailable
                      ? <><AlertCircle size={13} aria-hidden="true" /> This date is already booked</>
                      : <><CheckCircle2 size={13} aria-hidden="true" /> Date is available</>}
                  </motion.p>
                )}
              </AnimatePresence>
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
                placeholder="e.g. 150"
              />
            </div>

            {/* Mobile contact — required */}
            <div className="space-y-2">
              <Label htmlFor="client-phone">
                Mobile contact number
                <span className="ml-1.5 text-[11px] text-red-500 font-normal">Required</span>
              </Label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  id="client-phone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="09171234567 or +639171234567"
                  className={cn("pl-9", phoneError && "border-red-300 focus-visible:ring-red-300")}
                />
              </div>
              {phoneError && (
                <p className="flex items-center gap-1.5 text-[12px] text-red-600">
                  <AlertCircle size={12} aria-hidden="true" />
                  Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX)
                </p>
              )}
              {phoneValid && (
                <p className="flex items-center gap-1.5 text-[12px] text-emerald-600">
                  <CheckCircle2 size={12} aria-hidden="true" />
                  Valid mobile number
                </p>
              )}
              <p className="text-[11px] text-text-muted">
                Our team will contact you at this number to discuss your booking details.
              </p>
            </div>

            {/* ── Vendor needs (FR-19) ────────────────────────── */}
            <div className="space-y-2">
              <div>
                <Label>Vendor services needed</Label>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Select services you want us to arrange. Our team will coordinate vendors for you.
                  <span className="ml-1 italic">Optional — you can always update this later.</span>
                </p>
              </div>

              <VendorCategoryPicker
                value={vendorCategories}
                onChange={setVendorCategories}
              />

              {vendorCategories.length > 0 && (
                <p className="text-[11px] text-primary font-medium">
                  {vendorCategories.length} service{vendorCategories.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes <span className="text-text-muted text-[11px]">(optional)</span></Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special requests, theme, color motif, dietary needs…"
                rows={3}
              />
            </div>

            {/* Customizations */}
            <div className="space-y-2">
              <Label>Package customizations <span className="text-text-muted text-[11px]">(optional)</span></Label>
              <div className="flex gap-2">
                <Input
                  value={newCustomization}
                  onChange={(e) => setNewCustomization(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomization() } }}
                  placeholder="e.g. extra floral arch, gold candelabras…"
                />
                <Button type="button" variant="outline" onClick={addCustomization} disabled={!newCustomization.trim()}>
                  <Plus size={14} aria-hidden="true" />
                </Button>
              </div>
              {customizations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customizations.map((c) => (
                    <span key={c} className="flex items-center gap-1 rounded-pill border border-border bg-background-blush px-2.5 py-1 text-[12px] text-text-sub">
                      {c}
                      <button onClick={() => setCustomizations((p) => p.filter((x) => x !== c))}>
                        <X size={11} className="text-text-muted hover:text-red-500" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button className="w-full mt-2" onClick={() => setStep(1)} disabled={!step0Valid}>
              Choose a package <ArrowRight size={14} aria-hidden="true" />
            </Button>
          </motion.div>
        )}

        {/* ── Step 1: Package ───────────────────────────────── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={SPRING}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-text-muted">
                {filteredPackages.length} package{filteredPackages.length !== 1 ? "s" : ""} for {eventType.toLowerCase()}
              </p>
              {venue.isProvincial && <Badge variant="warning">Provincial rates shown</Badge>}
            </div>
            {filteredPackages.length === 0 ? (
              <div className="rounded-xl border border-border bg-background-blush p-8 text-center">
                <p className="text-[13px] text-text-muted">No packages available for this event type.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredPackages.map((pkg) => (
                  <PackageCard
                    key={pkg.id} pkg={pkg}
                    selected={selectedPackage?.id === pkg.id}
                    onSelect={setSelectedPackage}
                    isProvincial={venue.isProvincial}
                  />
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                <ArrowLeft size={14} aria-hidden="true" /> Back
              </Button>
              <Button onClick={() => setStep(2)} disabled={!selectedPackage} className="flex-1">
                Review & submit <ArrowRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Review ────────────────────────────────── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={SPRING}
            className="flex flex-col gap-4"
          >
            <div className="rounded-xl border border-border bg-white p-5 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Review your booking
              </p>
              {[
                { label: "Event type",   value: EVENT_TYPES.find((t) => t.value === eventType)?.label ?? eventType },
                { label: "Event date",   value: new Date(eventDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) },
                { label: "Venue",        value: venue.venueFormattedAddress ?? venue.venue },
                { label: "Guest count",  value: `${guestCount} guests` },
                { label: "Mobile",       value: clientPhone },
                { label: "Package",      value: selectedPackage?.name ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 text-[13px]">
                  <span className="text-text-muted shrink-0">{label}</span>
                  <span className="text-text-main font-medium text-right">{value}</span>
                </div>
              ))}

              {/* Vendor services review */}
              {vendorCategories.length > 0 && (
                <div className="border-t border-border pt-3 space-y-1.5">
                  <p className="text-[11px] text-text-muted">Vendor services requested</p>
                  <div className="flex flex-wrap gap-1.5">
                    {vendorCategories.map((cat) => (
                      <span
                        key={cat}
                        className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary"
                      >
                        <span aria-hidden="true">{VENDOR_CATEGORY_ICONS[cat]}</span>
                        {VENDOR_CATEGORY_LABELS[cat]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {customizations.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="text-[11px] text-text-muted mb-1.5">Customizations</p>
                  <div className="flex flex-wrap gap-1">
                    {customizations.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-[12px] text-text-muted">Estimated price</span>
                <div className="flex items-center gap-2">
                  {venue.isProvincial && <Badge variant="warning">Provincial</Badge>}
                  <span className="text-[20px] font-bold tracking-tighter text-text-main">
                    {selectedPackage
                      ? fmt(
                          venue.isProvincial && selectedPackage.priceProvincial
                            ? Number(selectedPackage.priceProvincial)
                            : Number(selectedPackage.price),
                        )
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-700">
              <p className="font-semibold mb-0.5">Before you submit</p>
              Our team will contact you at <strong>{clientPhone}</strong> to discuss your booking
              details, agree on the deposit amount, and finalise payment terms.
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft size={14} aria-hidden="true" /> Back
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={isPending || !canSubmit}>
                {isPending ? "Submitting…" : "Submit booking request"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
