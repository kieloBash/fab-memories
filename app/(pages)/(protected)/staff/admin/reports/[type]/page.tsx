// app/(pages)/(protected)/staff/admin/reports/[type]/page.tsx

import { notFound } from "next/navigation"
import { isReportType } from "@/features/reports"
import { ReportPage } from "@/features/reports/components/report-page"

export default async function AdminReportPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  if (!isReportType(type)) notFound()
  return <ReportPage type={type} basePath="/staff/admin" />
}
