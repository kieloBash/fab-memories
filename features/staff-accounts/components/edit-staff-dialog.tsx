// features/staff-accounts/components/edit-staff-dialog.tsx
"use client"

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Power } from "lucide-react"
import { useState } from "react"
import { STAFF_ROLES, STAFF_ROLE_LABELS, type StaffAccount, type StaffRole, useDeactivateStaffAccount, useUpdateStaffAccount } from "@/features/staff-accounts"

/** Edit + Deactivate/Reactivate for one staff account. `isSelf` disables the controls the server would refuse anyway. */
export function EditStaffDialog({ account, isSelf }: { account: StaffAccount; isSelf: boolean }) {
  const [open, setOpen] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [fullName, setFullName] = useState(account.fullName)
  const [role, setRole] = useState<StaffRole>(account.role as StaffRole)
  const { mutate: update, isPending: isUpdating } = useUpdateStaffAccount()
  const { mutate: deactivate, isPending: isDeactivating } = useDeactivateStaffAccount()

  const handleSave = () => {
    const input: Record<string, unknown> = {}
    if (fullName.trim() !== account.fullName) input.fullName = fullName.trim()
    if (role !== account.role) input.role = role
    if (Object.keys(input).length === 0) { setOpen(false); return }
    update({ id: account.id, input }, { onSuccess: () => setOpen(false) })
  }

  const handleReactivate = () => update({ id: account.id, input: { isActive: true } })

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" data-testid="staff-edit-button" onClick={() => setOpen(true)}>
          <Pencil size={13} aria-hidden="true" /> Edit
        </Button>
        {account.isActive ? (
          <Button
            variant="outline" size="sm" data-testid="staff-deactivate-button" disabled={isSelf}
            title={isSelf ? "You cannot deactivate your own account." : undefined}
            onClick={() => setConfirmDeactivate(true)}
          >
            <Power size={13} aria-hidden="true" /> Deactivate
          </Button>
        ) : (
          <Button variant="outline" size="sm" data-testid="staff-reactivate-button" disabled={isDeactivating} onClick={handleReactivate}>
            <Power size={13} aria-hidden="true" /> Reactivate
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {account.fullName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-name-${account.id}`}>Full name</Label>
              <Input id={`edit-name-${account.id}`} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-role-${account.id}`}>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as StaffRole)} disabled={isSelf}>
                <SelectTrigger id={`edit-role-${account.id}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => <SelectItem key={r} value={r}>{STAFF_ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
              {isSelf && <p className="text-[11px] text-text-muted">You cannot change your own role.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isUpdating || !fullName.trim()}>{isUpdating ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {account.fullName}'s account?</AlertDialogTitle>
            <AlertDialogDescription>They will no longer be able to sign in. You can reactivate this account at any time.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deactivate(account.id); setConfirmDeactivate(false) }}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
