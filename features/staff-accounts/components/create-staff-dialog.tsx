// features/staff-accounts/components/create-staff-dialog.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus } from "lucide-react"
import { useState } from "react"
import { STAFF_ROLES, STAFF_ROLE_LABELS, type StaffRole, useCreateStaffAccount } from "@/features/staff-accounts"

export function CreateStaffDialog() {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<StaffRole>("COORDINATOR")
  const { mutate, isPending } = useCreateStaffAccount()

  const reset = () => { setUsername(""); setPassword(""); setFullName(""); setRole("COORDINATOR") }

  const handleSubmit = () =>
    mutate({ username: username.trim(), password, fullName: fullName.trim(), role }, {
      onSuccess: () => { setOpen(false); reset() },
    })

  return (
    <>
      <Button onClick={() => setOpen(true)}><UserPlus size={14} aria-hidden="true" /> New account</Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>New staff account</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-staff-fullname">Full name</Label>
            <Input id="new-staff-fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan dela Cruz" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-staff-username">Username</Label>
            <Input id="new-staff-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jdelacruz" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-staff-password">Temporary password</Label>
            <Input id="new-staff-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-staff-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
              <SelectTrigger id="new-staff-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((r) => <SelectItem key={r} value={r}>{STAFF_ROLE_LABELS[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !fullName.trim() || username.trim().length < 3 || password.length < 8}>
            {isPending ? "Creating…" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  )
}
