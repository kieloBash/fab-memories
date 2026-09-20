// features/reports/reports.handler.ts
//
// Route logic shared by:
//   GET /api/reports/{bookings|payments|vendors|staff|audit}
//   GET /api/reports/[type]/export
// so each route file stays a one-liner and every report gets identical
// auth, validation, audit logging and error handling. Server-only.

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { NextResponse } from "next/server"
import { isReportType, type ReportType } from "./reports.constants"
import { manilaYmd } from "./reports.dates"
import { buildCsv } from "./reports.export"
import { logReportExport, logReportFailure, logReportView } from "./reports.logging"
import { REPORT_REGISTRY } from "./reports.registry"
import { parseReportFilters, reportExportQuerySchema } from "./reports.schema"
import { describeFilters } from "./reports.shared"

const NO_STORE = { "Cache-Control": "no-store" }

type Authorised =
  | { ok: true; actor: NonNullable<Awaited<ReturnType<typeof getCurrentDbUser>>> }
  | { ok: false; response: NextResponse }

async function authorise(roles: ("ADMIN" | "COORDINATOR")[]): Promise<Authorised> {
  try {
    await requireRole(roles)
  } catch (err) {
    const unauthenticated = err instanceof Error && err.message === "UNAUTHENTICATED"
    return {
      ok: false,
      response: NextResponse.json(
        { error: unauthenticated ? "Unauthorized" : "Forbidden" },
        { status: unauthenticated ? 401 : 403 },
      ),
    }
  }

  const actor = await getCurrentDbUser()
  if (!actor) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (!actor.isActive) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { ok: true, actor }
}

function withoutPaging<T extends { page?: number; pageSize?: number }>(filters: T) {
  const { page: _page, pageSize: _pageSize, ...rest } = filters
  return rest
}

// ── GET /api/reports/<type> ──────────────────────────────────────

export async function handleReportGet(req: Request, type: ReportType): Promise<NextResponse> {
  const def = REPORT_REGISTRY[type]

  const auth = await authorise(def.roles)
  if (!auth.ok) return auth.response
  const { actor } = auth

  const parsed = parseReportFilters(new URL(req.url).searchParams)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid filters" },
      { status: 422 },
    )
  }
  const filters = parsed.data

  let report
  try {
    report = await def.run(filters, { mode: "page", page: filters.page, pageSize: filters.pageSize })
  } catch (err) {
    console.error(`[reports] ${type} report failed`, err)
    await logReportFailure({
      userId: actor.id,
      description: `${actor.role} "${actor.fullName}" — ${def.label} report failed to generate`,
      metadata: { report: type, filters: withoutPaging(filters) },
    })
    return NextResponse.json({ error: "Failed to generate the report" }, { status: 500 })
  }

  await logReportView({
    userId: actor.id,
    description: `${actor.role} "${actor.fullName}" viewed the ${def.label} report (${describeFilters(filters)})`,
    metadata: {
      report: type,
      filters: withoutPaging(filters),
      totalRows: report.meta.totalRows,
      durationMs: report.meta.durationMs,
    },
  })

  return NextResponse.json(report, { headers: NO_STORE })
}

// ── GET /api/reports/<type>/export ───────────────────────────────

export async function handleReportExport(req: Request, rawType: string): Promise<Response> {
  if (!isReportType(rawType)) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 })
  }
  const type = rawType
  const def = REPORT_REGISTRY[type]

  const auth = await authorise(def.roles)
  if (!auth.ok) return auth.response
  const { actor } = auth

  const searchParams = new URL(req.url).searchParams

  const parsed = parseReportFilters(searchParams)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid filters" },
      { status: 422 },
    )
  }
  const exportQuery = reportExportQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
  if (!exportQuery.success) {
    return NextResponse.json({ error: "Unsupported export format or table" }, { status: 422 })
  }
  const filters = parsed.data

  let report
  try {
    report = await def.run(filters, { mode: "all" })
  } catch (err) {
    console.error(`[reports] ${type} export failed`, err)
    await logReportFailure({
      userId: actor.id,
      description: `${actor.role} "${actor.fullName}" — ${def.label} report export failed`,
      metadata: { report: type, filters: withoutPaging(filters) },
    })
    return NextResponse.json({ error: "Failed to export the report" }, { status: 500 })
  }

  const table = def.exportTable(report, exportQuery.data.table)
  if (!table) {
    return NextResponse.json({ error: "Unknown export table for this report" }, { status: 404 })
  }

  const csv = buildCsv(table.rows, table.columns)
  const filename = `${type}${table.key ? `-${table.key}` : ""}-report-${manilaYmd()}.csv`

  await logReportExport({
    userId: actor.id,
    description: `${actor.role} "${actor.fullName}" exported the ${def.label} report${table.key ? ` (${table.key})` : ""} as CSV (${describeFilters(filters)})`,
    metadata: {
      report: type,
      table: table.key || "main",
      format: "csv",
      filters: withoutPaging(filters),
      rowCount: table.rows.length,
      truncated: report.meta.truncated,
      durationMs: report.meta.durationMs,
    },
  })

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      ...NO_STORE,
    },
  })
}
