// app/api/vendors/[vendorId]/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { updateVendorSchema } from "@/features/vendors/vendors.schema"
import {
  deleteVendorRecord,
  getVendorById,
  updateVendorRecord,
} from "@/features/vendors/vendors.query"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ vendorId: string }> }

export async function GET(_req: Request, { params }: Params) {
  try { await requireRole(["ADMIN", "COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const { vendorId } = await params
  const vendor = await getVendorById(vendorId)
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })

  return NextResponse.json(vendor)
}

export async function PATCH(req: Request, { params }: Params) {
  try { await requireRole(["ADMIN"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { vendorId } = await params
  const body   = await req.json().catch(() => ({}))
  const parsed = updateVendorSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )

  const existing = await getVendorById(vendorId)
  if (!existing) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })

  const vendor = await updateVendorRecord(vendorId, parsed.data)
  await logAction({
    userId:      actor.id,
    action:      "UPDATE",
    module:      "VENDOR",
    description: `Admin "${actor.fullName}" updated vendor "${existing.name}"`,
    metadata:    { vendorId },
  })

  return NextResponse.json(vendor)
}

export async function DELETE(_req: Request, { params }: Params) {
  try { await requireRole(["ADMIN"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { vendorId } = await params
  const existing = await getVendorById(vendorId)
  if (!existing) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })

  await deleteVendorRecord(vendorId)
  await logAction({
    userId:      actor.id,
    action:      "DELETE",
    module:      "VENDOR",
    description: `Admin "${actor.fullName}" deleted vendor "${existing.name}"`,
    metadata:    { vendorId },
  })

  return NextResponse.json({ success: true })
}
