// app/api/public/packages/route.ts
//
// PUBLIC route — no Clerk session required.
// Powers the /packages marketing page.
//
// Deliberately excludes internal fields present on the authenticated
// /api/packages route: `_count.bookings` (business intel) and inactive
// packages are never returned regardless of query params.

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const packages = await prisma.package.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      eventType: true,
      price: true,
      priceProvincial: true,
      inclusions: true,
    },
    orderBy: [{ eventType: "asc" }, { price: "asc" }],
  })

  return NextResponse.json(packages)
}
