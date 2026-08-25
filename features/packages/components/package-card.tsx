// features/packages/components/package-card.tsx

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"
import type { Package } from "../packages.types"

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: "Wedding",
  DEBUT: "Debut",
  CORPORATE: "Corporate Event",
  BIRTHDAY: "Birthday",
  OTHER: "Other",
}

interface PackageCardProps {
  pkg: Package
  selected?: boolean
  onSelect?: (pkg: Package) => void
}

export function PackageCard({ pkg, selected, onSelect }: PackageCardProps) {
  const formattedPrice = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(pkg.price))

  return (
    <Card
      onClick={() => onSelect?.(pkg)}
      className={[
        onSelect ? "cursor-pointer transition-all hover:shadow-md" : "",
        selected ? "ring-2 ring-primary" : "",
        !pkg.isActive ? "opacity-60" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">{pkg.name}</CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {EVENT_TYPE_LABELS[pkg.eventType] ?? pkg.eventType}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-lg font-semibold">{formattedPrice}</span>
          {!pkg.isActive && (
            <Badge variant="outline" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {pkg.description && (
          <p className="mb-3 text-sm text-muted-foreground">{pkg.description}</p>
        )}
        <ul className="space-y-1">
          {pkg.inclusions.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
