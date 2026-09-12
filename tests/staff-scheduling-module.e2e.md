# Module 5 — Staff Scheduling
## End-to-End Test Cases

Accounts (all passwords: `FabMemories123!`):
- Admin: `admin` → `/staff-login`
- Coordinator (primary): `coordinator` (Maria Santos) → `/staff-login`
- Coordinator: `coordinator2` (James Villanueva) → `/staff-login`
- Coordinator: `coordinator3` (Kristine Uy) → `/staff-login`
- Coordinator: `coordinator4` (Paolo Mendoza) → `/staff-login`

Migration required:
```bash
npx prisma migrate dev --name add-staff-scheduling
npx prisma generate
npx prisma db seed
```

---

## TC-SS-01 — Admin views the coordinator roster (FR-36)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Go to `/staff/admin/staff` | Roster loads with 4 coordinators |
| 2 | Admin | Check Maria Santos's row | Shows "Next: Debut · [date]" and an upcoming count ≥ 1 |
| 3 | Admin | Check James Villanueva's row | Shows "No upcoming assignments" or a lower count than Maria |
| 4 | Admin | Click a roster row with a next assignment | Navigates to that booking's detail page |
| 5 | Admin | Click a roster row with no assignment | Nothing happens (button disabled) |

**Pass:** Roster reflects real assignment data, not placeholders.

---

## TC-SS-02 — Admin assigns a coordinator to a booking (FR-38)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open Ben's Corporate booking detail (`/staff/admin/bookings/[id]`) | "Staff scheduling" panel visible below Vendor coordination |
| 2 | Admin | Click "Assign coordinator" | Dialog opens with coordinator selector |
| 3 | Admin | Select "Kristine Uy" | Selected; conflict check runs automatically |
| 4 | Admin | No conflict found | Green "No scheduling conflicts on this date" banner shown |
| 5 | Admin | Select task role "Vendor Liaison" | |
| 6 | Admin | Add task detail: "Coordinate backdrop setup with Glow Events" | |
| 7 | Admin | Leave "Backup coordinator" toggle off | |
| 8 | Admin | Click "Assign coordinator" | Toast "Coordinator assigned to event". Dialog closes. Card appears in panel |
| 9 | DB check | `StaffAssignment` row | Created with correct `bookingId`, `coordinatorId`, `taskRole`, `isBackup: false` |

**Pass:** Assignment created, visible immediately, roster updates on next visit.

---

## TC-SS-03 — FR-37 staffing recommendation banner

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open Anna's Debut booking detail | Staff scheduling panel shows amber "Below recommended staffing" banner |
| 2 | Admin | Read banner text | "200 guests (151+ guests) → recommended 8–12 coordinators. Currently assigned: 3." |
| 3 | Admin | Confirm backup coordinator is NOT counted | Assigned count reads 3 (matches 3 primary; the 1 backup is excluded) |
| 4 | Admin | Assign 5 more coordinators (any available) until count reaches 8 | Banner switches to green "Staffing on track" with a checkmark |

**Pass:** Banner accurately reflects FR-37 ratio table and updates live as assignments change.

---

## TC-SS-04 — FR-40 conflict detection (pre-seeded conflict)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open Anna's Debut (Maria Santos assigned, Lead Coordinator) | Panel shows Maria Santos card |
| 2 | Admin | Open Ben's Birthday (same event date as Anna's Debut) | Panel shows Maria Santos card here too |
| 3 | Admin | On Ben's Birthday, click "Assign coordinator" | Dialog opens |
| 4 | Admin | Select James Villanueva (not conflicted) | Green "No scheduling conflicts" banner |
| 5 | Admin | Cancel, reopen dialog, hypothetically re-select Maria Santos | *(Maria is already assigned to this booking so she won't appear in the picker — conflict is instead visible by comparing both bookings' panels, per steps 1–2)** |
| 6 | DB check | Both `StaffAssignment` rows for Maria Santos exist, different `bookingId`, same `eventDate` on their parent bookings | Confirms conflict condition |

**Pass:** Conflict is informational only — both assignments exist and are valid. Admin retains full control (no hard block anywhere in the flow).

---

## TC-SS-05 — Live conflict warning when assigning a genuinely double-booked coordinator

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Create a new test booking with the same `eventDate` as an existing CONFIRMED booking that already has a coordinator assigned | |
| 2 | Admin | Open the new booking → "Assign coordinator" → select the coordinator who's already committed elsewhere that date | Amber "Already committed on this date" banner appears, listing the conflicting event count |
| 3 | Admin | Proceed anyway and click "Assign coordinator" | Assignment succeeds — warning did not block it |
| 4 | Audit check | `AuditLog` entry for this assignment | `metadata.hasConflict: true` recorded |

**Pass:** Live conflict check works for newly created double-bookings, not just pre-seeded ones. Audit trail captures the conflict flag.

---

## TC-SS-06 — FR-39 backup coordinator designation

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open Anna's Debut | James Villanueva's card shows a "Backup" badge with a shield icon |
| 2 | Admin | Card styling | Dashed border, slightly muted background (visually distinct from primary assignments) |
| 3 | Admin | Assign a new coordinator with "Backup coordinator" toggled on | New card also renders with the Backup badge |
| 4 | Admin | Check staffing compliance banner | Backup assignment does NOT increase the "Currently assigned" count |

**Pass:** Backup designation is visually distinct and correctly excluded from FR-37 compliance counting.

---

## TC-SS-07 — Admin removes a coordinator from a booking

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Click trash icon on an assigned coordinator's card | Toast "Coordinator removed from event". Card disappears |
| 2 | Admin | Check staffing compliance banner | Assigned count decreases by 1 (if removed assignment was primary) |
| 3 | Admin | Check roster page | That coordinator's upcoming count decreases |
| 4 | DB check | `StaffAssignment` row | Deleted |
| 5 | Audit check | `AuditLog` | `DELETE` action logged under `STAFF_SCHEDULE` module |

---

## TC-SS-08 — Coordinator self-service: "My assignments"

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Maria Santos (`coordinator`) | Log in → go to `/staff/coordinator/staff` | "My assignments" section shows Anna's Debut and Ben's Birthday |
| 2 | Maria | Check Anna's Debut card | Shows "Lead Coordinator" badge, CONFIRMED status, event date and venue |
| 3 | Maria | Check Ben's Birthday card | Shows "Lead Coordinator" badge, PENDING status |
| 4 | Maria | Click Anna's Debut card | Navigates to `/staff/coordinator/bookings/[id]` |
| 5 | James Villanueva (`coordinator2`) | Log in → go to `/staff/coordinator/staff` | "My assignments" shows only Anna's Debut, with "Backup" badge |
| 6 | James | Confirm James cannot see Maria's assignments | Only James's own rows returned — self-scoped API |

**Pass:** `/api/staff/my-schedule` is correctly self-scoped; no coordinator can see another's assignment list through this endpoint.

---

## TC-SS-09 — Coordinator can assign staff (per RBAC decision: Admin + Coordinator both can assign)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Kristine Uy (`coordinator3`) | Log in → open any booking detail under `/staff/coordinator/bookings/[id]` | Staff scheduling panel visible with "Assign coordinator" button enabled |
| 2 | Kristine | Assign Paolo Mendoza to the booking | Succeeds — COORDINATOR role is allowed to assign, same as ADMIN |

---

## TC-SS-10 — Fixed task role list (per design decision: fixed, not free text)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open "Assign coordinator" dialog | Task role dropdown shows exactly 6 options: Lead Coordinator, Guest Registration, Vendor Liaison, Logistics, Program Flow, Other |
| 2 | Admin | Select "Other" | Task detail field remains available for free-text elaboration |
| 3 | Admin | Attempt to submit with an invalid/empty task role via direct API call | `422` — Zod validation rejects any value outside the fixed enum |

---

## TC-SS-11 — Role access control

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| E1 | Client | `GET /api/staff` | 403 Forbidden |
| E2 | Vendor | `GET /api/staff` | 403 Forbidden |
| E3 | Vendor | `POST /api/bookings/[bookingId]/staff` | 403 Forbidden |
| E4 | Client | `GET /api/staff/my-schedule` | 403 Forbidden |
| E5 | Admin | `GET /api/staff/my-schedule` | 403 Forbidden (self-schedule is COORDINATOR-only, even for Admin — see TC-SS-08 note) |
| E6 | Coordinator | `GET /api/staff/my-schedule` | 200 OK — own assignments only |
| E7 | Coordinator | `POST /api/bookings/[bookingId]/staff` | 200 OK — coordinators can assign, per design decision |
| E8 | Admin | `DELETE /api/bookings/[bookingId]/staff/[assignmentId]` | 200 OK |
| E9 | Coordinator | `DELETE /api/bookings/[bookingId]/staff/[assignmentId]` | 200 OK — coordinators can also remove assignments |

---

## Edge Cases

| # | Scenario | Expected |
|---|----------|----------|
| EC1 | Assign the same coordinator twice to the same booking | `409` — "This coordinator is already assigned to this booking" |
| EC2 | Assign a non-COORDINATOR user (e.g. a VENDOR or ADMIN user ID) via direct API call | `422` — "Selected user is not a coordinator" |
| EC3 | Assign a coordinator to a booking, then toggle their assignment from primary to backup via PATCH | Staffing compliance count updates (decreases) on next fetch |
| EC4 | Booking with zero staff assignments | Panel shows empty state, compliance banner still renders (0 assigned vs. recommended range) |
| EC5 | Booking with guestCount exactly at a band boundary (50, 150) | Correct band selected — 50 guests → "Up to 50 guests" (4–5), 51 guests → "51–150 guests" (7–8) |
| EC6 | Remove a coordinator's only assignment while conflict existed with another booking | Conflict resolves — reopening the other booking's assign dialog for that coordinator now shows no conflict |
| EC7 | Inactive coordinator (`isActive: false`) | Does not appear in the "Assign coordinator" picker, but still appears in the roster list with an "Inactive" badge |
