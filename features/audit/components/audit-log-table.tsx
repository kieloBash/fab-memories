// features/audit/components/audit-log-table.tsx
"use client"

import { useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { AuditActionBadge } from "./audit-action-badge"
import { AUDIT_MODULE_LABELS } from "@/features/audit"
import type { AuditLogEntry, AuditLogPage } from "@/features/audit"
import { ChevronDown, ChevronRight, ChevronLeft, User as UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface AuditLogTableProps {
  data?: AuditLogPage
  isLoading: boolean
  onPageChange: (page: number) => void
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          {[1, 2, 3, 4, 5, 6].map((j) => (
            <TableCell key={j}>
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-primary-soft" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function ExpandedMetadata({ entry }: { entry: AuditLogEntry }) {
  return (
    <TableRow>
      <TableCell colSpan={7} className="bg-background-blush">
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
                Chain position
              </p>
              <p className="text-[12px] font-mono text-text-sub">#{entry.sequence}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
                Entry hash
              </p>
              <p className="text-[11px] font-mono text-text-sub break-all">{entry.hash}</p>
            </div>
          </div>
          {entry.previousHash && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
                Previous hash
              </p>
              <p className="text-[11px] font-mono text-text-sub break-all">{entry.previousHash}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
              Metadata
            </p>
            {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
              <pre className="text-[11px] font-mono text-text-sub bg-white rounded-lg border border-border p-2 overflow-x-auto">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            ) : (
              <p className="text-[11px] text-text-muted italic">No additional metadata</p>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function AuditLogTable({ data, isLoading, onPageChange }: AuditLogTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows />
            ) : !data || data.entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-[13px] text-text-muted">
                  No audit log entries match these filters.
                </TableCell>
              </TableRow>
            ) : (
              data.entries.map((entry) => (
                <>
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer"
                    onClick={() => toggle(entry.id)}
                  >
                    <TableCell>
                      {expanded.has(entry.id)
                        ? <ChevronDown size={13} className="text-text-muted" aria-hidden="true" />
                        : <ChevronRight size={13} className="text-text-muted" aria-hidden="true" />}
                    </TableCell>
                    <TableCell className="text-text-sub whitespace-nowrap text-[12px]">
                      {fmtDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <UserIcon size={11} className="text-text-muted shrink-0" aria-hidden="true" />
                        <span className="text-[12px] font-medium text-text-main truncate max-w-[120px]">
                          {entry.userName ?? "System"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell><AuditActionBadge action={entry.action} /></TableCell>
                    <TableCell className="text-[12px] text-text-sub">
                      {AUDIT_MODULE_LABELS[entry.module]}
                    </TableCell>
                    <TableCell className="text-[12px] text-text-sub max-w-[280px] truncate">
                      {entry.description}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold",
                        entry.status === "SUCCESS"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700",
                      )}>
                        {entry.status}
                      </span>
                    </TableCell>
                  </TableRow>
                  {expanded.has(entry.id) && <ExpandedMetadata key={`${entry.id}-meta`} entry={entry} />}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-text-muted">
            Page {data.page} of {data.totalPages} · {data.total} total entries
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="icon-sm"
              onClick={() => onPageChange(data.page - 1)}
              disabled={data.page <= 1}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </Button>
            <Button
              variant="outline" size="icon-sm"
              onClick={() => onPageChange(data.page + 1)}
              disabled={data.page >= data.totalPages}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
