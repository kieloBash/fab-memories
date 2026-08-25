// components/ui/button.tsx

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-pill border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // ← No bg-* here — gradient applied via style prop below
        default:
          "text-white shadow-primary-sm hover:opacity-90 hover:shadow-primary-md active:opacity-95",
        outline:
          "border-border-strong bg-transparent text-primary hover:bg-primary-soft hover:border-primary/40",
        secondary:
          "bg-primary-soft text-primary hover:bg-primary-soft/80 border-transparent",
        ghost:
          "text-text-sub hover:bg-primary-soft hover:text-primary border-transparent",
        destructive:
          "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 focus-visible:ring-red-300/40",
        link: "text-primary underline-offset-4 hover:underline border-transparent",
      },
      size: {
        default: "h-9 px-4",
        xs: "h-6 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 px-3",
        lg: "h-10 px-5 text-[15px]",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  style,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      style={
        variant === "default" || variant === undefined
          ? {
            background:
              "linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)",
            ...style,
          }
          : style
      }
      {...props}
    />
  )
}

export { Button, buttonVariants }