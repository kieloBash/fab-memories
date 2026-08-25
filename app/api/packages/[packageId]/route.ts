// app/api/packages/[packageId]/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { updatePackageSchema } from "@/features/packages/packages.schema"
import {
  getPackageById,
  updatePackageRecord,
} from "@/features/packages/packages.query"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ packageId: string }> }

/**
 * GET /api/packages/[packageId]
 * Returns a single package with booking count.
 * Admin only (detail view — catalog list uses GET /api/packages).
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    await requireRole(["ADMIN"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { packageId } = await params
  const pkg = await getPackageById(packageId)

  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 })
  }

  return NextResponse.json(pkg)
}

/**
 * PATCH /api/packages/[packageId]
 * Partially updates a package. Admin only.
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireRole(["ADMIN"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { packageId } = await params
  const existing = await getPackageById(packageId)

  if (!existing) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = updatePackageSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )
  }

  const updated = await updatePackageRecord(packageId, parsed.data)

  const actor = await getCurrentDbUser()
  await logAction({
    userId: actor?.id,
    action: "UPDATE",
    module: "BOOKING",
    description: `Admin updated package "${existing.name}"`,
    metadata: { packageId, changes: parsed.data },
  })

  return NextResponse.json(updated)
}
