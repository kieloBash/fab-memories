// components/ui/input.tsx

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Base
        "h-9 w-full min-w-0 rounded-pill border border-input bg-white px-4 py-1 text-sm text-text-main transition-colors outline-none",
        // Placeholder
        "placeholder:text-text-muted",
        // Focus — pink ring
        "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20",
        // File input
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
