# Module 4 — Vendor Directory & Coordination
## End-to-End Test Cases

Accounts (all passwords: `FabMemories123!`):
- Admin: `admin` → `/staff-login`
- Coordinator: `coordinator` → `/staff-login`
- Vendor: `vendor` → `/staff-login` (assigned to Anna's Debut)
- Anna: `anna.fabmemories@example.com` → `/sign-in`

Migration required:
```bash
npx prisma migrate dev --name add-vendor-module
npx prisma generate
npx prisma db seed
```

---

## TC-VM-01 — Admin creates a vendor in the private directory

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Go to `/staff/admin/vendors` | Vendor directory page loads with existing seeded vendors |
| 2 | Admin | Click "Add vendor" | Navigates to `/staff/admin/vendors/new` |
| 3 | Admin | Fill: Name "SoundWave Audio", Category "Sounds & Lighting" | |
| 4 | Admin | Contact: "Carlo Tan", phone "09301234567", channel "Viber" | |
| 5 | Admin | Coverage: click "Metro Manila" + "Cebu" | Both highlighted in pink |
| 6 | Admin | Notes: "₱8,000 per event. Includes wireless mic & speakers." | |
| 7 | Admin | Click "Add to directory" | Toast "Vendor added to directory". Redirected to vendor list |
| 8 | Admin | Find "SoundWave Audio" in grid | Card shows category icon, contact, coverage, 0 bookings |

**Pass:** Vendor record created. `isActive = true`. Visible in directory.

---

## TC-VM-02 — Admin edits a vendor

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Hover over a vendor card | Edit (pencil) and delete icons appear |
| 2 | Admin | Click edit icon | Navigates to `/staff/admin/vendors/[id]` |
| 3 | Admin | Change phone number | |
| 4 | Admin | Save | Toast "Vendor updated". Change reflected in directory |

---

## TC-VM-03 — Admin deletes a vendor

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Click delete icon on a vendor | Alert dialog: "This removes them from your directory. Past booking assignments are kept." |
| 2 | Admin | Confirm delete | Toast "Vendor removed". Card disappears |
| 3 | Admin | Check existing booking that had this vendor assigned | Booking-vendor assignment still exists in DB (cascade NOT applied on delete for past records) |

**Pass:** Soft-delete from directory. Existing assignments preserved.

---

## TC-VM-04 — Client specifies vendor categories on new booking (FR-19)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Go to `/portal/bookings/new` → Step 0 | "Vendor needs" multi-select visible |
| 2 | Anna | Select "Photography", "Florals", "Catering" | 3 chips highlighted |
| 3 | Anna | Deselect "Catering" | 2 chips selected |
| 4 | Anna | Complete booking and submit | Booking created |
| 5 | DB check | `Booking.vendorCategories` | `["PHOTOGRAPHY", "FLORALS"]` |
| 6 | Anna | Client booking detail | Shows "Vendor needs: 📷 Photography · 🌸 Florals" |
| 7 | Admin | Admin booking detail → vendor panel | "Client needs" section shows 📷 Photography and 🌸 Florals chips |

**Pass:** `vendorCategories` stored and displayed on both client and admin views.

---

## TC-VM-05 — Admin assigns a vendor to a booking

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open a booking detail | "Vendor coordination" panel visible on left column |
| 2 | Admin | Click "Add vendor" | Dialog opens with Category dropdown and vendor list |
| 3 | Admin | Select Category "Photography" | Vendor list shows only photographers. "★ Requested" label next to Photography if client requested it |
| 4 | Admin | Search "Lens" | Filters to "Lens & Frame Photography" |
| 5 | Admin | Click the vendor | Vendor highlighted with checkmark |
| 6 | Admin | Add note "Full-day ₱25,000" | |
| 7 | Admin | Click "Assign vendor" | Toast "Vendor assigned to booking". Dialog closes. Vendor card appears in panel |

**Pass:** `BookingVendor` record created. `contactedAt` and `confirmedAt` are null initially.

---

## TC-VM-06 — Admin marks vendor as contacted and confirmed

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | View vendor card in booking panel | "Mark contacted" and "Mark confirmed" buttons visible |
| 2 | Admin | Click "Mark contacted" | Button updates: "Contacted [today's date]" (blue) |
| 3 | Admin | Click "Mark confirmed" | Button updates: "Confirmed [today's date]" (emerald) |
| 4 | Admin | Coverage section | Client's requested category for this vendor now shows green ✓ chip |
| 5 | DB check | `BookingVendor.contactedAt` + `confirmedAt` | Both set to current timestamp |

**Pass:** Status updates persist. Coverage check updates immediately.

---

## TC-VM-07 — Vendor availability conflict indicator

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Assign vendor already assigned to another event on the same date | API returns `{ conflicts: 1 }` |
| 2 | Admin | Vendor assignment succeeds (non-blocking) | Toast success. Assignment created |
| 3 | DB check | Audit log | Logs `conflicts: 1` in metadata |
| 4 | Admin | Can choose to call vendor and resolve externally | System does not block — just records |

**Pass:** Conflict is informational only. Admin retains full control.

---

## TC-VM-08 — Suggestion 4: Vendor coverage gate on booking confirmation

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Books with `vendorCategories = ["PHOTOGRAPHY", "CATERING"]` | Booking PENDING |
| 2 | Admin | Open booking → click "Confirm booking" | Dialog opens |
| 3 | Admin | Dialog shows amber warning | "Unconfirmed vendor categories: 📷 Photography 🍽️ Catering — no confirmed vendor yet." |
| 4 | Admin | Can still click "Yes, confirm booking" | Warning is advisory, not a hard block |
| 5 | Admin | Confirm | Booking → CONFIRMED. Toast success |

**Pass:** Warning shown but not blocking. Admin can override.

---

## TC-VM-09 — Coverage gate: all categories confirmed → green state

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Assign + mark-confirmed vendors for all requested categories | Coverage complete |
| 2 | Admin | Click "Confirm booking" | Dialog opens with green banner: "All requested vendor categories have confirmed vendors assigned." |
| 3 | Admin | Confirm | No warning. Clean confirmation flow |

**Pass:** Green state shows when all client-requested categories have at least one confirmed vendor.

---

## TC-VM-10 — Booking has no vendorCategories → no coverage check

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open booking where client selected no vendor categories | No "Client needs" section in vendor panel |
| 2 | Admin | Click "Confirm booking" | No vendor warning in dialog. Clean confirmation |

**Pass:** Coverage check only appears when `vendorCategories.length > 0`.

---

## TC-VM-11 — Admin removes a vendor from a booking

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Click trash icon on an assigned vendor card | Vendor removed. Toast success |
| 2 | Admin | Coverage section updates | Category now shows amber (uncovered) again if it was the only vendor |

---

## TC-VM-12 — Vendor portal: sees only assigned bookings

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Vendor | Log in at `/staff-login` with `vendor` account | Redirected to `/vendor/bookings` |
| 2 | Vendor | Sees list of assigned events | Only bookings where this vendor appears in BookingVendor |
| 3 | Vendor | Cannot see unassigned bookings | Correct — API filtered by role |
| 4 | Vendor | Click a booking | Detail page shows event details, category, admin notes |
| 5 | Vendor | Contact/confirm status visible | Shows "Contacted [date]" and "Confirmed [date]" if set |
| 6 | Vendor | Cannot see client payment info | Payment section not shown |
| 7 | Vendor | Cannot see other assigned vendors | Only their own assignments shown |

**Pass:** Vendor portal is read-only and scoped to their assignments only.

---

## TC-VM-13 — Admin filters vendor directory by category

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Vendor directory page → select "Catering" filter | Only catering vendors shown |
| 2 | Admin | Select "All categories" | All vendors shown |
| 3 | Admin | Select "Photography" with no photographers in DB | Empty state message |

---

## TC-VM-14 — Provincial booking: coverage area warning in assign dialog

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open a provincial booking (Cebu) → Add vendor → Photography | |
| 2 | Admin | Vendor list shows "Lens & Frame Photography" (coverage: Metro Manila, Batangas, Laguna) | "No coverage" amber badge shown next to this vendor |
| 3 | Admin | Select the vendor anyway | Assignment created (admin's decision) |
| 4 | Admin | Vendor with "Nationwide" coverage | No badge — covers everywhere |

**Pass:** Coverage mismatch shown as a warning badge, not a block.

---

## TC-VM-15 — Role access control

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| E1 | Client | `GET /api/vendors` | 403 Forbidden |
| E2 | Vendor | `POST /api/vendors` | 403 Forbidden |
| E3 | Vendor | `POST /api/bookings/[id]/vendors` | 403 Forbidden |
| E4 | Coordinator | `POST /api/vendors` (create vendor) | 403 Forbidden — ADMIN only |
| E5 | Coordinator | `GET /api/vendors` | 200 OK — can view directory |
| E6 | Coordinator | `POST /api/bookings/[id]/vendors` | 200 OK — can assign |
| E7 | Client | `GET /api/bookings/[id]/vendors` for own booking | 200 OK — sees assigned vendor categories only |
| E8 | Client | `GET /api/bookings/[id]/vendors` for another client's booking | 403 Forbidden |

---

## Edge Cases

| # | Scenario | Expected |
|---|----------|----------|
| EC1 | Assign same vendor twice to same booking | 409 — "already assigned" |
| EC2 | Admin unmarks confirmed (clicks again) | `confirmedAt` cleared. Coverage updates to uncovered |
| EC3 | Vendor with no coverage areas assigned to provincial booking | No "no coverage" badge (no areas = no mismatch shown) |
| EC4 | Booking with 5 vendor categories, all confirmed | Dialog shows green "All categories covered" |
| EC5 | Delete vendor who has active confirmed assignments | Vendor removed from directory but BookingVendor records preserved |
| EC6 | Coordinator views vendor detail page | Access allowed (read) |
| EC7 | Coordinator creates vendor | 403 — only ADMIN |
| EC8 | Client booking detail — shows vendor category names only, not vendor contact info | Correct — privacy |
