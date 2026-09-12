// features/audit/components/audit-filters-bar.tsx
"use client"

import type { AuditAction, AuditModule, AuditStatus } from "@/app/generated/prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { AuditFilterInput } from "@/features/audit"
import {
  AUDIT_ACTION_LABELS, AUDIT_MODULE_LABELS,
  useAuditFilterOptions,
} from "@/features/audit"
import { Search, X } from "lucide-react"

interface AuditFiltersBarProps {
  filters: AuditFilterInput
  onChange: (next: AuditFilterInput) => void
}

const MODULES = Object.keys(AUDIT_MODULE_LABELS) as AuditModule[]
const ACTIONS = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]

export function AuditFiltersBar({ filters, onChange }: AuditFiltersBarProps) {
  const { data: options } = useAuditFilterOptions()

  const hasActiveFilters =
    !!filters.from || !!filters.to || !!filters.userId || !!filters.module ||
    !!filters.action || !!filters.status || !!filters.search

  const set = (patch: Partial<AuditFilterInput>) =>
    onChange({ ...filters, ...patch, page: 1 }) // reset to page 1 on any filter change

  const clearAll = () => onChange({ page: 1, pageSize: filters.pageSize })

  return (
    <div className="rounded-xl border border-border bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
          <Input
            value={filters.search ?? ""}
            onChange={(e) => set({ search: e.target.value || undefined })}
            placeholder="Search descriptions…"
            className="pl-8 h-9 text-[13px]"
          />
        </div>

        <Input
          type="date"
          value={filters.from ?? ""}
          onChange={(e) => set({ from: e.target.value || undefined })}
          className="h-9 w-[150px] text-[13px]"
          aria-label="From date"
        />
        <Input
          type="date"
          value={filters.to ?? ""}
          onChange={(e) => set({ to: e.target.value || undefined })}
          className="h-9 w-[150px] text-[13px]"
          aria-label="To date"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={filters.userId ?? "ALL"}
          onValueChange={(v: any) => set({ userId: v === "ALL" ? undefined : v })}
        >
          <SelectTrigger className="h-9 w-44 text-[12px]"><SelectValue placeholder="All users" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All users</SelectItem>
            {options?.users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.module ?? "ALL"}
          onValueChange={(v) => set({ module: v === "ALL" ? undefined : (v as AuditModule) })}
        >
          <SelectTrigger className="h-9 w-44 text-[12px]"><SelectValue placeholder="All modules" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All modules</SelectItem>
            {MODULES.map((m) => (
              <SelectItem key={m} value={m}>{AUDIT_MODULE_LABELS[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.action ?? "ALL"}
          onValueChange={(v) => set({ action: v === "ALL" ? undefined : (v as AuditAction) })}
        >
          <SelectTrigger className="h-9 w-40 text-[12px]"><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All actions</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? "ALL"}
          onValueChange={(v) => set({ status: v === "ALL" ? undefined : (v as AuditStatus) })}
        >
          <SelectTrigger className="h-9 w-36 text-[12px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="FAILURE">Failure</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-[12px] text-text-muted">
            <X size={12} aria-hidden="true" /> Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
