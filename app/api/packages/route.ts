// app/api/packages/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { createPackageSchema } from "@/features/packages/packages.schema"
import {
  createPackageRecord,
  getAllPackages,
} from "@/features/packages/packages.query"
import { NextResponse } from "next/server"

/**
 * GET /api/packages
 * Returns all packages. Passing ?active=true filters to active-only.
 * All authenticated roles can list packages (needed for the booking form).
 */
export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN", "COORDINATOR", "VENDOR", "CLIENT"])
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get("active") === "true"

  const packages = await getAllPackages(activeOnly)
  return NextResponse.json(packages)
}

/**
 * POST /api/packages
 * Creates a new service package. Admin only.
 */
export async function POST(req: Request) {
  try {
    await requireRole(["ADMIN"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = createPackageSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )
  }

  const pkg = await createPackageRecord(parsed.data)

  const actor = await getCurrentDbUser()
  await logAction({
    userId: actor?.id,
    action: "CREATE",
    module: "BOOKING",
    description: `Admin created package "${pkg.name}"`,
    metadata: { packageId: pkg.id },
  })

  return NextResponse.json(pkg, { status: 201 })
}
