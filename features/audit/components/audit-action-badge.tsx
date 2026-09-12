// features/audit/components/audit-action-badge.tsx

import type { AuditAction } from "@/app/generated/prisma/client"
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_COLORS } from "@/features/audit"
import { cn } from "@/lib/utils"

export function AuditActionBadge({ action }: { action: AuditAction }) {
  const colors = AUDIT_ACTION_COLORS[action]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11px] font-semibold",
        colors.bg, colors.text,
      )}
    >
      {AUDIT_ACTION_LABELS[action]}
    </span>
  )
}
