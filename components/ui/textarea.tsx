// components/ui/textarea.tsx

import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Base
        "flex field-sizing-content min-h-[100px] w-full resize-none rounded-xl border border-input bg-white px-4 py-3 text-sm text-text-main transition-colors outline-none",
        // Placeholder
        "placeholder:text-text-muted",
        // Focus — pink ring
        "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
