// features/packages/components/package-card.tsx

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, MapPin, Circle, Pencil, Power } from "lucide-react"
import type { Package } from "../packages.types"
import { cn } from "@/lib/utils"

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING:   "Wedding",
  DEBUT:     "Debut",
  CORPORATE: "Corporate Event",
  BIRTHDAY:  "Birthday",
  OTHER:     "Other",
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(n)

interface PackageCardProps {
  pkg: Package
  selected?: boolean
  onSelect?: (pkg: Package) => void
  isProvincial?: boolean   // when true, shows priceProvincial if available
  /** Admin-only actions (Edit / Activate-Deactivate). Omit these props anywhere the card is used for selection. */
  onEdit?: (pkg: Package) => void
  onToggleActive?: (pkg: Package) => void
  isTogglingActive?: boolean
}

export function PackageCard({ pkg, selected, onSelect, isProvincial, onEdit, onToggleActive, isTogglingActive }: PackageCardProps) {
  const hasProvincePrice = !!pkg.priceProvincial
  const displayPrice = isProvincial && hasProvincePrice
    ? Number(pkg.priceProvincial)
    : Number(pkg.price)

  const clickable = !!onSelect

  return (
    <div
      onClick={() => onSelect?.(pkg)}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={clickable ? !!selected : undefined}
      onKeyDown={
        clickable
          ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(pkg) } }
          : undefined
      }
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-xl border bg-white p-5 transition-all duration-200",
        clickable && "cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "border-primary shadow-primary-sm ring-2 ring-primary/20"
          : "border-border hover:border-border-strong",
        !pkg.isActive && clickable && "opacity-60 pointer-events-none",  // inactive = unselectable for clients; admin actions stay usable
        !pkg.isActive && !clickable && "opacity-70",
      )}
    >
      {/*
        FIX: previously the only "this is clickable" signal was a cursor
        change and a checkmark that appeared only *after* selecting.
        First-time users had no discovery cue. Now every card in a
        selectable context shows a persistent radio-style indicator
        top-right — filled pink when selected, an outlined circle
        (with a "Select" hint on hover) when not.
      */}
      {clickable && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {!selected && (
            <span className="text-[10px] font-medium text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
              Select
            </span>
          )}
          {selected ? (
            <CheckCircle2 size={20} className="text-primary" aria-hidden="true" />
          ) : (
            <Circle size={20} className="text-border-strong group-hover:text-primary/40 transition-colors" aria-hidden="true" />
          )}
        </div>
      )}

      {/* Header */}
      <div className="space-y-1 pr-8">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-semibold tracking-tight text-text-main leading-tight">
            {pkg.name}
          </p>
          {!pkg.isActive && <Badge variant="muted">Inactive</Badge>}
        </div>
        <p className="text-[12px] text-text-muted">
          {EVENT_TYPE_LABELS[pkg.eventType] ?? pkg.eventType}
        </p>
      </div>

      {/* Price */}
      <div className="space-y-1">
        <p className="text-[22px] font-bold tracking-tighter text-text-main">
          {fmt(displayPrice)}
        </p>
        {isProvincial && hasProvincePrice && (
          <div className="flex items-center gap-1 text-[11px] text-amber-600">
            <MapPin size={11} aria-hidden="true" />
            Provincial rate · Metro Manila: {fmt(Number(pkg.price))}
          </div>
        )}
        {isProvincial && !hasProvincePrice && (
          <div className="flex items-center gap-1 text-[11px] text-text-muted">
            <MapPin size={11} aria-hidden="true" />
            Provincial — contact us for travel rates
          </div>
        )}
      </div>

      {/* Description */}
      {pkg.description && (
        <p className="text-[12px] text-text-sub leading-relaxed">{pkg.description}</p>
      )}

      {/* Inclusions */}
      <ul className="space-y-1.5">
        {pkg.inclusions.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[12px] text-text-sub">
            <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* Admin actions — stopPropagation so these never trigger the card's own onSelect */}
      {(onEdit || onToggleActive) && (
        <div className="mt-1 flex items-center gap-2 border-t border-border pt-3 pointer-events-auto">
          {onEdit && (
            <Button variant="outline" size="sm" data-testid="package-edit-button" onClick={(e) => { e.stopPropagation(); onEdit(pkg) }}>
              <Pencil size={13} aria-hidden="true" /> Edit
            </Button>
          )}
          {onToggleActive && (
            <Button
              variant="outline" size="sm" disabled={isTogglingActive}
              data-testid="package-toggle-active-button"
              onClick={(e) => { e.stopPropagation(); onToggleActive(pkg) }}
            >
              <Power size={13} aria-hidden="true" /> {pkg.isActive ? "Deactivate" : "Activate"}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
