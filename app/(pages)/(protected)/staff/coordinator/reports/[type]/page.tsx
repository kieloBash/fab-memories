// app/(pages)/(protected)/staff/coordinator/reports/[type]/page.tsx

import { notFound } from "next/navigation"
import { isReportType, REPORT_ROLES } from "@/features/reports"
import { ReportPage } from "@/features/reports/components/report-page"

export default async function CoordinatorReportPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  // The audit report is admin-only (FR-50); the API enforces this too.
  if (!isReportType(type) || !REPORT_ROLES[type].includes("COORDINATOR")) notFound()
  return <ReportPage type={type} basePath="/staff/coordinator" />
}
