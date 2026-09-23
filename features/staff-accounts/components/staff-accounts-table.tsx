// features/staff-accounts/components/staff-accounts-table.tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { AlertCircle, Loader2 } from "lucide-react"
import { STAFF_ROLE_LABELS, useStaffAccounts, type StaffAccount, type StaffRole } from "@/features/staff-accounts"
import { EditStaffDialog } from "./edit-staff-dialog"

export function StaffAccountsTable({ currentUsername }: { currentUsername: string | null | undefined }) {
  const { data: accounts, isLoading, isError } = useStaffAccounts()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-[13px] text-text-muted">
        <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Loading accounts…
      </div>
    )
  }
  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-600">
        <AlertCircle size={14} aria-hidden="true" /> Couldn't load staff accounts.
      </div>
    )
  }
  if (!accounts || accounts.length === 0) {
    return <p className="py-10 text-center text-[13px] text-text-muted">No staff accounts yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-border bg-background-blush">
          <tr>
            <th className="px-4 py-2.5 font-semibold text-text-muted">Name</th>
            <th className="px-4 py-2.5 font-semibold text-text-muted">Username</th>
            <th className="px-4 py-2.5 font-semibold text-text-muted">Role</th>
            <th className="px-4 py-2.5 font-semibold text-text-muted">Status</th>
            <th className="px-4 py-2.5 font-semibold text-text-muted text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account: StaffAccount) => (
            <tr key={account.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-text-main">
                {account.fullName}{account.username === currentUsername && <span className="ml-1.5 text-[11px] text-text-muted">(you)</span>}
              </td>
              <td className="px-4 py-3 text-text-sub">{account.username ?? "—"}</td>
              <td className="px-4 py-3 text-text-sub">{STAFF_ROLE_LABELS[account.role as StaffRole] ?? account.role}</td>
              <td className="px-4 py-3">
                <Badge variant={account.isActive ? "default" : "muted"}>{account.isActive ? "Active" : "Deactivated"}</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <EditStaffDialog account={account} isSelf={account.username === currentUsername} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
