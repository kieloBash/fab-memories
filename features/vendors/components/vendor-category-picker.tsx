// features/vendors/components/vendor-category-picker.tsx
"use client"

/**
 * VendorCategoryPicker
 *
 * Multi-select chip grid for clients to indicate which vendor services
 * they need for their event (FR-19).
 *
 * Props:
 *   value    – currently selected VendorCategory[]
 *   onChange – called with the updated array on every toggle
 *   disabled – locks all chips (for read-only review step)
 */

import { cn } from "@/lib/utils"
import { VENDOR_CATEGORY_ICONS, VENDOR_CATEGORY_LABELS } from "@/features/vendors"
import type { VendorCategory } from "@/features/vendors"
import { X } from "lucide-react"

const ALL_CATEGORIES = Object.keys(VENDOR_CATEGORY_LABELS) as VendorCategory[]

interface VendorCategoryPickerProps {
  value: VendorCategory[]
  onChange: (next: VendorCategory[]) => void
  disabled?: boolean
}

export function VendorCategoryPicker({
  value,
  onChange,
  disabled = false,
}: VendorCategoryPickerProps) {
  const toggle = (cat: VendorCategory) => {
    if (disabled) return
    onChange(
      value.includes(cat)
        ? value.filter((c) => c !== cat)
        : [...value, cat],
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((cat) => {
          const selected = value.includes(cat)
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              disabled={disabled}
              aria-pressed={selected}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                selected
                  ? "border-primary bg-primary-soft text-primary shadow-primary-sm"
                  : "border-border bg-white text-text-sub hover:border-border-strong hover:bg-background-blush",
                disabled && "cursor-default opacity-80",
              )}
            >
              <span aria-hidden="true">{VENDOR_CATEGORY_ICONS[cat]}</span>
              {VENDOR_CATEGORY_LABELS[cat]}
            </button>
          )
        })}
      </div>

      {/*
        FIX: previously the only feedback was a tiny 11px line that
        appeared *only* when something was selected — nothing prompted
        the user before they'd made a choice, and there was no way to
        clear the selection short of un-tapping every chip individually.
      */}
      {!disabled && (
        value.length === 0 ? (
          <p className="text-[11px] text-text-muted">
            Optional — tap any services above you'd like us to help arrange.
          </p>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-primary">
              {value.length} service{value.length !== 1 ? "s" : ""} selected
            </p>
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-red-500 transition-colors"
            >
              <X size={11} aria-hidden="true" />
              Clear all
            </button>
          </div>
        )
      )}
    </div>
  )
}
