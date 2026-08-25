// features/bookings/components/venue-picker.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, X } from "lucide-react"
import { detectIsMetroManila } from "../bookings.constants"

export interface VenuePickerValue {
  venue: string
  venueLatitude?: number
  venueLongitude?: number
  venueFormattedAddress?: string
  isProvincial?: boolean
}

interface VenuePickerProps {
  value: VenuePickerValue
  onChange: (value: VenuePickerValue) => void
  disabled?: boolean
}

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: Record<string, unknown>,
          ) => {
            addListener: (event: string, cb: () => void) => void
            getPlace: () => {
              formatted_address?: string
              name?: string
              geometry?: { location?: { lat: () => number; lng: () => number } }
            }
          }
        }
      }
    }
  }
}

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) { resolve(); return }

    const existing = document.getElementById("google-maps-script")
    if (existing) {
      existing.addEventListener("load", () => resolve())
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn("[venue-picker] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set — autocomplete disabled")
      reject(new Error("No API key"))
      return
    }

    const script = document.createElement("script")
    script.id  = "google-maps-script"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload  = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Google Maps"))
    document.head.appendChild(script)
  })
}

export function VenuePicker({ value, onChange, disabled }: VenuePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [apiMissing, setApiMissing] = useState(false)
  const isPinned = !!(value.venueLatitude && value.venueLongitude)

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setReady(true))
      .catch(() => setApiMissing(true))
  }, [])

  useEffect(() => {
    if (!ready || !inputRef.current || !window.google?.maps?.places) return

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current!, {
      types: ["establishment", "geocode"],
      componentRestrictions: { country: "ph" },
      fields: ["formatted_address", "geometry", "name"],
    })

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace()
      const lat   = place.geometry?.location?.lat()
      const lng   = place.geometry?.location?.lng()
      const addr  = place.formatted_address ?? place.name ?? ""

      const isProvincial = lat && lng
        ? !detectIsMetroManila(addr)
        : !detectIsMetroManila(addr)

      onChange({
        venue:                 place.name ?? addr,
        venueFormattedAddress: addr,
        venueLatitude:         lat,
        venueLongitude:        lng,
        isProvincial,
      })
    })
  }, [ready, onChange])

  const clearPin = () => {
    onChange({
      venue:                 value.venue,
      venueLatitude:         undefined,
      venueLongitude:        undefined,
      venueFormattedAddress: undefined,
      isProvincial:          !detectIsMetroManila(value.venue),
    })
  }

  return (
    <div className="space-y-2">
      <Label>Venue</Label>

      <div className="relative">
        <MapPin
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          value={value.venue}
          onChange={(e) => {
            const text = e.target.value
            onChange({
              ...value,
              venue:                 text,
              venueLatitude:         undefined,
              venueLongitude:        undefined,
              venueFormattedAddress: undefined,
              isProvincial:          !detectIsMetroManila(text),
            })
          }}
          placeholder={
            apiMissing
              ? "Type venue name or address…"
              : "Search for a venue…"
          }
          disabled={disabled}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {isPinned && (
          <button
            type="button"
            onClick={clearPin}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
            aria-label="Clear pin"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Pin info / map preview */}
      {isPinned && (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <Navigation size={13} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-emerald-700">Location pinned</p>
              {value.venueFormattedAddress && (
                <p className="text-[11px] text-emerald-600 truncate">{value.venueFormattedAddress}</p>
              )}
            </div>
            {value.isProvincial !== undefined && (
              <Badge variant={value.isProvincial ? "warning" : "secondary"} className="ml-auto shrink-0">
                {value.isProvincial ? "Provincial" : "Metro Manila"}
              </Badge>
            )}
          </div>

          {/* Embedded static map preview */}
          {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
            <div className="overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${value.venueLatitude},${value.venueLongitude}&zoom=15&size=600x200&scale=2&markers=color:0xF564A9%7C${value.venueLatitude},${value.venueLongitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                alt="Venue map preview"
                className="w-full h-40 object-cover"
                loading="lazy"
              />
            </div>
          )}
        </div>
      )}

      {/* Pricing hint */}
      {!isPinned && value.venue && (
        <p className="text-[11px] text-text-muted">
          {detectIsMetroManila(value.venue)
            ? "Detected: Metro Manila — standard pricing applies."
            : "Detected: Provincial venue — additional travel rates may apply."}
          {" "}
          Search above for a more accurate location.
        </p>
      )}

      {apiMissing && (
        <p className="text-[11px] text-text-muted">
          Map search unavailable — type the venue name manually.
        </p>
      )}
    </div>
  )
}
