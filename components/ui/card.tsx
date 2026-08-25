// components/ui/card.tsx

import * as React from "react"
import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  clickable = false,
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  clickable?: boolean
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        // Base
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-white py-(--card-spacing) text-sm text-card-foreground",
        // Border — uses the pink-tinted CSS var
        "border border-border",
        // Spacing scale
        "[--card-spacing:--spacing(5)] data-[size=sm]:[--card-spacing:--spacing(4)]",
        // Image rounding
        "has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        // Clickable state
        clickable && "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover hover:border-border-strong",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1.5 px-(--card-spacing)",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "has-data-[slot=card-description]:grid-rows-[auto_auto]",
        "[.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-[15px] font-semibold tracking-tight text-text-main",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[13px] text-text-muted leading-relaxed", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
