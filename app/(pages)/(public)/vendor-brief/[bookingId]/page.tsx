// app/(pages)/(public)/vendor-brief/[bookingId]/page.tsx
//
// PUBLIC page — no Clerk session required.
// Accessible via: /vendor-brief/[bookingId]?view=[bookingVendorId]
//
// This is the external-facing vendor event brief shared by the admin.
// It shows event logistics scoped to the vendor's assignment only.
// No client PII, no pricing, no other vendor data is shown.

import { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  CalendarDays, MapPin, Users, Package2, ExternalLink,
  CheckCircle2, Clock, MessageCircle, UserCheck,
  AlertTriangle, Building2, Navigation,
} from "lucide-react"
import { VENDOR_CATEGORY_ICONS, VENDOR_CATEGORY_LABELS } from "@/features/vendors"
import type { VendorCategory } from "@/features/vendors"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────

interface BookingSnippet {
  id: string
  eventType: string
  eventDate: string
  venue: string
  venueLatitude: number | null
  venueLongitude: number | null
  venueFormattedAddress: string | null
  guestCount: number
  status: string
  notes: string | null
  packageCustomizations: string[]
  isProvincial: boolean
  vendorCategories: VendorCategory[]
  package: { name: string; eventType: string }
}

interface AssignmentSnippet {
  id: string
  category: VendorCategory
  notes: string | null
  contactedAt: string | null
  confirmedAt: string | null
  vendor: { name: string; category: string }
}

interface BriefData {
  booking: BookingSnippet
  assignment: AssignmentSnippet | null
}

// ── Data fetching ─────────────────────────────────────────────

async function getBriefData(
  bookingId: string,
  view: string | null,
): Promise<BriefData | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const url  = new URL(`/api/vendor-brief/${bookingId}`, base)
  if (view) url.searchParams.set("view", view)

  const res = await fetch(url.toString(), {
    // Always fresh — brief data changes when admin marks contacted/confirmed
    cache: "no-store",
  })
  if (!res.ok) return null
  return res.json()
}

// ── Metadata ──────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bookingId: string }>
}): Promise<Metadata> {
  const { bookingId } = await params
  return {
    title:       "Event Brief — Fab Memories Events",
    description: `Vendor event brief for booking ${bookingId}`,
    robots:      { index: false, follow: false }, // don't index public links
  }
}

// ── Helpers ───────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING:   "Wedding",
  DEBUT:     "Debut",
  CORPORATE: "Corporate Event",
  BIRTHDAY:  "Birthday",
  OTHER:     "Event",
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:                 { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200" },
  CONFIRMED:               { label: "Confirmed", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  CANCELLED:               { label: "Cancelled", color: "bg-red-100 text-red-600 border-red-200" },
  CANCELLATION_REQUESTED:  { label: "Under review", color: "bg-orange-100 text-orange-700 border-orange-200" },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  })
}

// ── Sub-components ────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-start gap-4", className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fce8f3]">
        <Icon size={15} className="text-[#F564A9]" aria-hidden="true" />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-[11px] font-medium text-[#b08aa0] uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <div className="text-[14px] font-medium text-[#1a0a12]">{children}</div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default async function VendorBriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const { bookingId }  = await params
  const { view = null } = await searchParams

  const data = await getBriefData(bookingId, view)
  if (!data) notFound()

  const { booking, assignment } = data

  const status    = STATUS_LABELS[booking.status] ?? STATUS_LABELS.PENDING
  const eventLabel = EVENT_TYPE_LABELS[booking.eventType] ?? "Event"
  const hasPin     = !!(booking.venueLatitude && booking.venueLongitude)
  const mapsUrl    = hasPin
    ? `https://www.google.com/maps?q=${booking.venueLatitude},${booking.venueLongitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(booking.venueFormattedAddress ?? booking.venue)}`

  // Determine confirmation state label for assignment section header
  const isConfirmed  = !!assignment?.confirmedAt
  const isContacted  = !!assignment?.contactedAt

  return (
    <div className="min-h-screen bg-[#fdf7fb]">

      {/* ── Top bar ── */}
      <header className="border-b border-[rgba(245,100,169,0.15)] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Logo mark */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F564A9]">
              <span className="text-[14px]" aria-hidden="true">🌸</span>
            </div>
            <div>
              <p className="text-[13px] font-bold tracking-tight text-[#1a0a12]">
                Fab Memories Events
              </p>
              <p className="text-[10px] text-[#b08aa0]">Vendor Event Brief</p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-semibold",
              status.color,
            )}
          >
            {status.label}
          </span>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-5">

        {/* ── Event title hero ── */}
        <div className="rounded-2xl border border-[rgba(245,100,169,0.15)] bg-white p-6 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#b08aa0]">
            Event brief
          </p>
          <h1 className="text-[28px] font-bold tracking-tight text-[#1a0a12]">
            {eventLabel}
          </h1>
          <p className="text-[15px] font-medium text-[#F564A9]">
            {fmtDate(booking.eventDate)}
          </p>
        </div>

        {/* ── Your assignment — shown first when view= is present ── */}
        {assignment && (
          <div className={cn(
            "rounded-2xl border-2 p-6 space-y-4",
            isConfirmed
              ? "border-emerald-200 bg-emerald-50"
              : "border-[rgba(245,100,169,0.25)] bg-[#fce8f3]/50",
          )}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#b08aa0]">
                  Your assignment
                </p>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 rounded-full border border-[rgba(245,100,169,0.3)] bg-white px-3 py-1 text-[13px] font-semibold text-[#1a0a12]">
                    <span aria-hidden="true">
                      {VENDOR_CATEGORY_ICONS[assignment.category]}
                    </span>
                    {VENDOR_CATEGORY_LABELS[assignment.category]}
                  </span>
                </div>
              </div>
              {/* Confirmation badge */}
              <div className={cn(
                "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold",
                isConfirmed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-white text-[#b08aa0] border border-[rgba(245,100,169,0.2)]",
              )}>
                {isConfirmed
                  ? <><CheckCircle2 size={13} aria-hidden="true" /> Confirmed</>
                  : <><Clock size={13} aria-hidden="true" /> Awaiting confirmation</>}
              </div>
            </div>

            {/* Coordinator notes — agreed rate / scope */}
            {assignment.notes && (
              <div className="rounded-xl bg-white border border-[rgba(245,100,169,0.15)] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#b08aa0] mb-1">
                  Coordinator notes
                </p>
                <p className="text-[14px] text-[#1a0a12] leading-relaxed">
                  {assignment.notes}
                </p>
              </div>
            )}

            {/* Contact + confirm timeline */}
            <div className="grid grid-cols-2 gap-3">
              <div className={cn(
                "rounded-xl border p-3 space-y-1",
                isContacted
                  ? "border-blue-200 bg-blue-50"
                  : "border-[rgba(245,100,169,0.15)] bg-white",
              )}>
                <div className="flex items-center gap-1.5">
                  <MessageCircle
                    size={13}
                    className={isContacted ? "text-blue-500" : "text-[#b08aa0]"}
                    aria-hidden="true"
                  />
                  <p className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider",
                    isContacted ? "text-blue-600" : "text-[#b08aa0]",
                  )}>
                    Contacted
                  </p>
                </div>
                <p className={cn(
                  "text-[12px] font-medium",
                  isContacted ? "text-blue-700" : "text-[#b08aa0]",
                )}>
                  {isContacted ? fmtShort(assignment.contactedAt!) : "Not yet"}
                </p>
              </div>

              <div className={cn(
                "rounded-xl border p-3 space-y-1",
                isConfirmed
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-[rgba(245,100,169,0.15)] bg-white",
              )}>
                <div className="flex items-center gap-1.5">
                  <UserCheck
                    size={13}
                    className={isConfirmed ? "text-emerald-500" : "text-[#b08aa0]"}
                    aria-hidden="true"
                  />
                  <p className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider",
                    isConfirmed ? "text-emerald-600" : "text-[#b08aa0]",
                  )}>
                    Confirmed
                  </p>
                </div>
                <p className={cn(
                  "text-[12px] font-medium",
                  isConfirmed ? "text-emerald-700" : "text-[#b08aa0]",
                )}>
                  {isConfirmed ? fmtShort(assignment.confirmedAt!) : "Pending"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Event details ── */}
        <div className="rounded-2xl border border-[rgba(245,100,169,0.15)] bg-white p-6 space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#b08aa0]">
            Event details
          </p>

          <DetailRow icon={CalendarDays} label="Date">
            {fmtDate(booking.eventDate)}
          </DetailRow>

          <DetailRow icon={MapPin} label="Venue">
            <span className="block">
              {booking.venueFormattedAddress ?? booking.venue}
            </span>
            {booking.isProvincial && (
              <span className="mt-1 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                Provincial
              </span>
            )}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-[#F564A9] hover:underline w-fit"
            >
              {hasPin
                ? <><Navigation size={11} aria-hidden="true" /> View pinned location on Maps</>
                : <><ExternalLink size={11} aria-hidden="true" /> Search on Google Maps</>}
            </a>
          </DetailRow>

          <DetailRow icon={Users} label="Guest count">
            {booking.guestCount} guests
          </DetailRow>

          <DetailRow icon={Package2} label="Service package">
            {booking.package.name}
          </DetailRow>

          {booking.packageCustomizations.length > 0 && (
            <DetailRow icon={Building2} label="Customizations">
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {booking.packageCustomizations.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-[rgba(245,100,169,0.2)] bg-[#fdf7fb] px-2.5 py-0.5 text-[12px] text-[#6b4060]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </DetailRow>
          )}
        </div>

        {/* ── Client notes / theme ── */}
        {booking.notes && (
          <div className="rounded-2xl border border-[rgba(245,100,169,0.15)] bg-white p-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#b08aa0] mb-3">
              Event notes
            </p>
            <p className="text-[14px] text-[#1a0a12] leading-relaxed">
              {booking.notes}
            </p>
          </div>
        )}

        {/* ── Cancelled notice ── */}
        {booking.status === "CANCELLED" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-[14px] font-semibold text-red-700">This event has been cancelled</p>
              <p className="text-[13px] text-red-600 mt-1">
                Please contact the Fab Memories Events coordinator for further information.
              </p>
            </div>
          </div>
        )}

        {/* ── Footer notice ── */}
        <div className="rounded-2xl border border-[rgba(245,100,169,0.15)] bg-white p-5">
          <p className="text-[12px] font-semibold text-[#1a0a12] mb-1">
            Questions about this event?
          </p>
          <p className="text-[12px] text-[#6b4060] leading-relaxed">
            Contact the Fab Memories Events coordinator directly via your usual channel —
            phone, Viber, or FB Messenger. Please do not share the details on this page
            with anyone outside your team.
          </p>
        </div>

        {/* ── Branding footer ── */}
        <div className="text-center pt-2 pb-6">
          <p className="text-[11px] text-[#b08aa0]">
            This brief is shared exclusively with assigned vendors.
          </p>
          <p className="text-[11px] text-[#b08aa0] mt-0.5">
            © {new Date().getFullYear()} Fab Memories Events
          </p>
        </div>

      </main>
    </div>
  )
}
