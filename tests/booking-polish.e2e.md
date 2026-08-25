# Booking Module Polish — End-to-End Test Cases

Accounts (all passwords: `FabMemories123!`):
- Admin:    `admin` → `/staff-login`
- Client A: `anna.fabmemories@example.com` → `/sign-in`
- Client B: `ben.fabmemories@example.com` → `/sign-in`

Required env var for map features: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## TC-01 — New booking with venue map pin + location pricing PASSED

**Tests:** Feature 3 (map pin), Feature 5 (location-based pricing)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Go to `/portal/bookings/new` | 3-step form with event type emoji grid |
| 2 | Anna | Select "Wedding" | Wedding emoji card highlighted |
| 3 | Anna | Set a future date | Green "Date is available" message appears |
| 4 | Anna | In venue field, type "Waterfront Hotel Cebu" | Google Places autocomplete suggestions appear |
| 5 | Anna | Select a result from the dropdown | Green "Location pinned" banner appears. "Provincial" badge shown (Cebu is outside Metro Manila). Static map preview renders |
| 6 | Anna | Click "Choose a package" | Step 2. Package cards show **provincial rate** if configured; "Provincial rates shown" badge visible |
| 7 | Anna | Select a package | Card gets pink ring + checkmark |
| 8 | Anna | Click "Review & submit" → Review step | Summary shows venue formatted address, provincial package price |
| 9 | Anna | Submit | Toast success. Redirected to `/portal/bookings`. New booking card visible |
| 10 | Admin | Open the booking | Map preview renders. "View pinned location" Google Maps link works |

**Pass criteria:** `venueLatitude`, `venueLongitude`, `venueFormattedAddress` stored in DB. Provincial badge shown correctly.

---

## TC-02 — New booking with Metro Manila venue PASSED

**Tests:** Feature 5 (Metro Manila pricing)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | New booking, type "Makati" in venue | Text-based detection: "Detected: Metro Manila — standard pricing applies." |
| 2 | Anna | Select a Google Places result with "Makati" in address | "Metro Manila" badge shown (not "Provincial") |
| 3 | Anna | View packages | Metro Manila price (standard) shown |

**Pass criteria:** `isProvincial = false` when address contains Metro Manila keywords.

---

## TC-03 — New booking with package customizations (FR-19) PASSED

**Tests:** Feature 6 (package customizations)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | New booking form → type "Gold floral arch" in customization field | Badge appears after pressing Enter or clicking + |
| 2 | Anna | Add 2 more customizations | All 3 appear as removable badges |
| 3 | Anna | Remove one by clicking X | Badge removed |
| 4 | Anna | Submit booking | Success |
| 5 | Anna | Open booking detail | Customizations section shows the 2 remaining badges |
| 6 | Admin | Open booking detail | Customizations section visible |

**Pass criteria:** `packageCustomizations` array stored in DB and displayed on both client and admin views.

---

## TC-04 — Client edits a PENDING booking (Feature 2) PASSED

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Open a PENDING booking | "Edit" button visible next to status badge |
| 2 | Anna | Click Edit | Navigates to `/portal/bookings/[id]/edit`. Form pre-filled with existing values |
| 3 | Anna | Change event date to an available date | Green availability indicator |
| 4 | Anna | Change venue — type new location | Old venue replaced. Old pin cleared. New search autocomplete available |
| 5 | Anna | Add a package customization | Badge appears |
| 6 | Anna | Click "Save changes" | Toast "Booking updated successfully". Redirected to booking detail with new values |
| 7 | Anna | Try to access edit page for a CONFIRMED booking directly via URL | Warning: "Cannot edit this booking — status is CONFIRMED" |

**Pass criteria:** `PATCH /api/bookings/[id]` with `updateBookingSchema` updates the record. Date availability re-checked.

---

## TC-05 — Client withdraws a PENDING booking with no payment (Feature 1a) PASSED

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Open a PENDING booking (no payment submitted) | "Withdraw request" button visible |
| 2 | Anna | Click "Withdraw request" | Alert dialog: "This will permanently remove your booking request" |
| 3 | Anna | Click "Keep request" | Dialog closes, booking unchanged |
| 4 | Anna | Click "Withdraw request" again → "Yes, withdraw" | Toast "Booking request withdrawn". Redirected to `/portal/bookings`. Booking removed |
| 5 | Admin | Check bookings list | Booking no longer appears |

**Pass criteria:** `DELETE /api/bookings/[id]` hard-deletes the record.

---

## TC-06 — Client cannot withdraw booking with submitted payment PASSED

**Tests:** Feature 1a guard

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Submit a deposit for a PENDING booking | Deposit status: Submitted |
| 2 | Anna | Try to withdraw the booking (if button still visible) | API returns 409: "Cannot withdraw — a payment has been submitted. Please contact staff to cancel." |

**Pass criteria:** Withdraw blocked when payment exists.

---

## TC-07 — Client requests cancellation of CONFIRMED booking (Feature 1b) PASSED

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Open a CONFIRMED booking | "Request cancellation" button visible (red outline) |
| 2 | Anna | Click button | Dialog opens with reason textarea and amber advisory note |
| 3 | Anna | Type fewer than 10 characters | Submit button remains disabled |
| 4 | Anna | Type a valid reason "I need to cancel due to family emergency" → Submit | Toast "Cancellation request submitted". Dialog closes |
| 5 | Anna | Check booking detail | Status badge: "Cancellation Requested". Amber "Cancellation requested" banner with reason shown. "Request cancellation" button hidden |
| 6 | Anna | Check bookings list | Booking card shows "Cancellation Requested" badge |
| 7 | Admin | Open bookings list | Booking shows "Cancellation Requested" status |
| 8 | Admin | Open booking detail | Orange alert banner at top: "Client requested cancellation" with reason and timestamp |

**Pass criteria:** Status → `CANCELLATION_REQUESTED`. `cancellationRequestReason` and `cancellationRequestedAt` stored.

---

## TC-08 — Admin approves cancellation request PASSED

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open a `CANCELLATION_REQUESTED` booking | Orange banner with "Cancel Booking" and "Decline request" buttons |
| 2 | Admin | Click "Cancel Booking" | Existing cancel dialog — admin must enter a cancellation reason |
| 3 | Admin | Enter reason and confirm | Booking status → CANCELLED. Toast success |
| 4 | Anna | Check booking detail | Red "Cancelled" badge. Cancellation reason shown. Journey tracker gone |

**Pass criteria:** `PATCH /api/bookings/[id]` with `{ status: "CANCELLED", cancellationReason }` works from CANCELLATION_REQUESTED state.

---

## TC-09 — Admin declines cancellation request

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open a `CANCELLATION_REQUESTED` booking | Orange banner visible |
| 2 | Admin | Click "Decline request" | Alert dialog: "Booking will be restored to Confirmed status" |
| 3 | Admin | Confirm decline | Booking status → CONFIRMED. Banner disappears |
| 4 | Anna | Check booking detail | "Confirmed" badge. Journey tracker visible. No cancellation banner |

**Pass criteria:** Status restored to `CONFIRMED` correctly.

---

## TC-10 — Event calendar view (FR-16) PASSED

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Go to `/staff/admin/bookings` | Grid view by default |
| 2 | Admin | Click "Calendar" toggle | Calendar view renders with current month |
| 3 | Admin | Navigate to a month with bookings | Booking pills appear on the correct dates with colored dots matching status |
| 4 | Admin | Click a booking pill | Navigates to booking detail |
| 5 | Admin | Check legend | Shows all 4 status colors: amber (Pending), green (Confirmed), red (Cancelled), orange (Cancellation Requested) |
| 6 | Admin | Click "Today" button | Calendar snaps back to current month |
| 7 | Admin | Set status filter to "CONFIRMED" then view calendar | Only confirmed bookings appear on calendar |
| 8 | Admin | Click "Grid" toggle | Returns to card grid |

**Pass criteria:** Calendar correctly maps `eventDate` to calendar cells. Status filter applies to both views.

---

## TC-11 — Booking status timeline / journey tracker (FR-13)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Open a new PENDING booking with no payments | Step 1 ("Submit reservation deposit") is **active** (pink). Steps 2 and 3 **pending** (gray) |
| 2 | Anna | Submit deposit | Step 1 sublabel → "Submitted — awaiting staff verification" |
| 3 | Admin | Verify deposit | Step 1 → **done** (green check). Step 2 → **done**. Step 3 → **active** (no schedule yet) |
| 4 | Admin | Create installment schedule (3 installments) | Step 3 sublabel → "0 of 3 installments paid" |
| 5 | Anna | Submit + admin verifies installment #1 | Step 3 sublabel → "1 of 3 installments paid" |
| 6 | All installments paid | Step 3 → **done** (green check) |

**Pass criteria:** Journey step statuses update correctly at each payment event.

---

## TC-12 — Venue map pin displayed on admin booking detail PASSED

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open a booking submitted with a map pin | Venue section shows formatted address + "View pinned location" link with Navigation icon |
| 2 | Admin | Click "View pinned location" | Opens Google Maps at exact coordinates in new tab |
| 3 | Admin | Check if map preview image renders | Static map image visible below venue text (requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) |
| 4 | Admin | Open a booking submitted without map pin (manual text only) | "Search on Maps" link shown instead of "View pinned location" |

---

## TC-13 — Location-based pricing with provincial package rate PARTIAL PASSED (TO UPDATE UI AFTER BOOKING)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Set `priceProvincial` on a Wedding package (e.g. ₱95,000 vs ₱85,000 Metro) | Via admin package management |
| 2 | Anna | New booking, select provincial venue (Cebu) | "Provincial" badge in venue picker |
| 3 | Anna | Go to Step 2 (packages) | Wedding package shows ₱95,000. "Provincial rates shown" badge visible. Metro rate shown below: "Metro Manila: ₱85,000" |
| 4 | Anna | Review step | Shows ₱95,000 as estimated price |
| 5 | Anna | Select Metro Manila venue | "Metro Manila" badge. Package shows standard ₱85,000 |

---

## TC-14 — Edge cases

| # | Scenario | Expected |
|---|----------|----------|
| E1 | Client tries to edit a CONFIRMED booking via direct URL | Warning displayed, form not shown |
| E2 | Client tries to withdraw a CONFIRMED booking via DELETE API directly | 409 — "can only withdraw a pending booking" |
| E3 | Client submits cancellation request with <10 chars reason | 422 — "Please provide at least 10 characters" |
| E4 | Client submits new booking on an already-confirmed date | 409 — "This date is already booked" |
| E5 | Client edits booking and changes date to an already-booked date | 409 — availability check re-runs, error shown |
| E6 | Client edits booking and keeps the same date | No availability conflict (booking excluded from check) |
| E7 | Admin views booking with no Google Maps API key | Map preview hidden, "View pinned location" link still works |
| E8 | No packages available for selected event type | "No packages available" message shown in step 2 |
| E9 | Client adds then removes all customizations | Empty `packageCustomizations: []` stored. Customizations section not shown in detail view |
| E10 | Calendar month with more than 3 bookings on one day | Shows first 3 pills + "+N more" text on that cell |
