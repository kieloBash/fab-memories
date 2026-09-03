// app/api/vendors/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { createVendorSchema, vendorFilterSchema } from "@/features/vendors/vendors.schema"
import { createVendorRecord, getAllVendors } from "@/features/vendors/vendors.query"
import { NextResponse } from "next/server"

/**
 * GET /api/vendors
 * Returns vendor directory. ADMIN + COORDINATOR only (private directory).
 */
export async function GET(req: Request) {
  try { await requireRole(["ADMIN", "COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const { searchParams } = new URL(req.url)
  const filters = vendorFilterSchema.safeParse({
    category: searchParams.get("category") ?? undefined,
    isActive: searchParams.get("isActive") === "false" ? false : true,
  })

  const vendors = await getAllVendors(filters.success ? filters.data : { isActive: true })
  return NextResponse.json(vendors)
}

/**
 * POST /api/vendors
 * Creates a new vendor in the private directory. ADMIN only.
 */
export async function POST(req: Request) {
  try { await requireRole(["ADMIN"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body   = await req.json().catch(() => ({}))
  const parsed = createVendorSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )

  const vendor = await createVendorRecord(parsed.data)

  await logAction({
    userId:      actor.id,
    action:      "CREATE",
    module:      "VENDOR",
    description: `Admin "${actor.fullName}" added vendor "${parsed.data.name}" (${parsed.data.category})`,
    metadata:    { vendorId: vendor.id, category: parsed.data.category },
  })

  return NextResponse.json(vendor, { status: 201 })
}
