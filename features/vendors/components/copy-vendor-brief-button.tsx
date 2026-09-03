// features/vendors/components/copy-vendor-brief-button.tsx
"use client"

/**
 * CopyVendorBriefButton
 *
 * Builds the public vendor brief URL for a specific BookingVendor assignment
 * and copies it to the clipboard. Used in BookingVendorPanel — one button
 * per assigned vendor card.
 *
 * URL format:
 *   /vendor-brief/[bookingId]?view=[bookingVendorId]
 *
 * The bookingVendorId is the cuid of the BookingVendor join record,
 * which acts as the access token (unguessable without the link).
 */

import { useState } from "react"
import { toast } from "sonner"
import { Link2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CopyVendorBriefButtonProps {
  bookingId: string
  bookingVendorId: string
  vendorName: string
  /** Optional extra class names for the button */
  className?: string
}

export function CopyVendorBriefButton({
  bookingId,
  bookingVendorId,
  vendorName,
  className,
}: CopyVendorBriefButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    // Build the full absolute URL from the current window origin
    const origin = window.location.origin
    const url = `${origin}/vendor-brief/${bookingId}?view=${bookingVendorId}`

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success(`Brief link copied for ${vendorName}`, {
        description: "Share this link directly with the vendor.",
        duration: 3000,
      })
      // Reset icon after 2s
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers that block clipboard API without user gesture
      toast.error("Could not copy to clipboard", {
        description: "Please copy this URL manually.",
      })
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy brief link for ${vendorName}`}
      aria-label={`Copy event brief link for ${vendorName}`}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
        copied
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-border bg-white text-text-muted hover:border-border-strong hover:text-text-sub",
        className,
      )}
    >
      {copied
        ? <><Check size={11} aria-hidden="true" /> Copied!</>
        : <><Link2 size={11} aria-hidden="true" /> Copy brief link</>}
    </button>
  )
}
