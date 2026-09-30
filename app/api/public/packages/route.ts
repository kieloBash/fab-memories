// app/api/public/packages/route.ts
//
// PUBLIC route — no Clerk session required.
// Powers the /packages marketing page.
//
// Deliberately excludes internal fields present on the authenticated
// /api/packages route: `_count.bookings` (business intel) and inactive
// packages are never returned regardless of query params.

import { ACTIVE_EVENT_TYPES, PROVINCIAL_PRICING_ENABLED } from "@/features/bookings/bookings.constants"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const packages = await prisma.package.findMany({
    // Only in-scope event types (Wedding, Debut) are shown publicly.
    where: { isActive: true, eventType: { in: [...ACTIVE_EVENT_TYPES] } },
    select: {
      id: true,
      name: true,
      description: true,
      eventType: true,
      price: true,
      priceProvincial: PROVINCIAL_PRICING_ENABLED,
      inclusions: true,
    },
    orderBy: [{ eventType: "asc" }, { price: "asc" }],
  })

  return NextResponse.json(packages)
}
