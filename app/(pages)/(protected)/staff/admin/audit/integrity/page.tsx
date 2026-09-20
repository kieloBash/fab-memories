// app/(pages)/(protected)/staff/admin/audit/integrity/page.tsx
"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { IntegrityChecks } from "@/features/integrity/components/integrity-checks"
import { PageHeader } from "@/components/ui/page-header"
import { SPRING } from "@/lib/framer/framer-utils"

export default function SystemIntegrityPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="flex flex-col gap-5">
      <Link href="/staff/admin/audit" className="inline-flex w-fit items-center gap-1 text-[12px] font-medium text-text-muted hover:text-primary">
        <ArrowLeft size={13} aria-hidden="true" /> Audit trail
      </Link>
      <PageHeader
        title="System integrity"
        subtitle="Live checks that the audit trail is untampered and the booking rules cannot be broken"
        icon={ShieldCheck}
      />
      <IntegrityChecks />
    </motion.div>
  )
}
