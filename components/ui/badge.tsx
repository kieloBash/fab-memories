// components/ui/badge.tsx

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap transition-colors [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // Brand pink — confirmed, verified, active
        default:
          "border-transparent bg-primary text-white",
        // Blush soft — pending review, submitted
        secondary:
          "border-transparent bg-primary-soft text-primary",
        // Pink-tinted outline — neutral / pending
        outline:
          "border-border-strong bg-transparent text-text-sub",
        // Red tint — cancelled, flagged, destructive
        destructive:
          "border-red-200 bg-red-50 text-red-600",
        // Green tint — success, completed, paid
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        // Amber tint — warning, needs attention
        warning:
          "border-amber-200 bg-amber-50 text-amber-700",
        // Gray — inactive, archived
        muted:
          "border-transparent bg-muted text-text-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
