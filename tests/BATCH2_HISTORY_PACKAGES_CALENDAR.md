# Batch 2 — booking status history, package edit/activate, cancelled events on the calendar

Three PRD items (FR-13, FR-03, FR-16), plus one real bug caught while testing them.

## FR-13 — Booking status history

`GET /api/bookings/[bookingId]/history` builds a timeline **from the audit trail** — no new table, one source
of truth. Only `SUCCESS` entries are shown (a timeline is what happened, not what was attempted or blocked;
blocked attempts stay on the staff-only audit trail page). Every label is written **server-side** from the
action code and metadata — never from the audit entry's raw `description` — so wording is controlled in one
place and can never show something private.

Access: ADMIN/COORDINATOR see any booking's history; a CLIENT sees only their own (403 otherwise).

Shown on all three booking detail pages (admin, coordinator, client) via `<BookingHistoryTimeline bookingId=…/>`.

## FR-03 — Package edit & activate/deactivate

- `PackageForm` — the create and edit forms are now one shared component.
- `/staff/admin/packages/[id]/edit` — new page.
- `PackageCard` gained optional `onEdit` / `onToggleActive` props (admin page only; unaffected anywhere the
  card is used for client-side selection). Deactivating asks for confirmation and states how many existing
  bookings are unaffected; reactivating does not (low-risk, reversible).
- Deactivating a package removes it from the public site and the booking form; existing bookings keep their
  agreed price and are untouched.

### A real bug, caught while testing this

`updatePackageSchema` was `createPackageSchema.partial()`. `isActive` had `.default(true)` on the base schema —
and **a Zod default survives `.partial()`**. A PATCH that omitted `isActive` (e.g. editing only the price)
silently reset it back to `true`, reactivating a package that had just been deactivated. This is the same class
of bug fixed in Batch 1 (vendor updates), just caused by the schema rather than the query function. Fixed by
writing `updatePackageSchema` out explicitly with no defaults, and rewriting `updatePackageRecord` to only set
fields actually present in the input (matching the Batch 1 pattern). Covered by a regression test; reverting the
fix on purpose was confirmed to fail the test.

## FR-16 — Cancelled events on the calendar

The staffing calendar (`/staff/coordinator/calendar`, and the admin staff page) now also shows CANCELLED
bookings: a hollow grey dot, a struck-through label, "Cancelled" as its only tooltip. A "Hide/Show cancelled
(N)" toggle is next to the legend. A cancelled event carries **no** staffing figures (`assignedCount: 0`,
`recommendation: null`, `isCompliant: null`) and is never counted by the scheduling-conflict check — confirmed
by a regression test that a CONFIRMED event sharing the same date is unaffected.

## Files

New: `features/bookings/booking-history.{types,query,api,hooks}.ts`,
`features/bookings/components/booking-history-timeline.tsx`,
`app/api/bookings/[bookingId]/history/route.ts`,
`app/(pages)/(protected)/staff/admin/packages/[packageId]/edit/page.tsx`,
`features/packages/components/package-form.tsx`,
`prisma/verify-booking-history.ts`, `prisma/verify-calendar-cancelled.ts`,
`test-harness/verify-booking-history-routes.ts`, `test-harness/verify-package-routes.ts`,
`test-harness/ui/booking-history.test.tsx`, `test-harness/ui/packages-admin.test.tsx`,
`test-harness/ui/staffing-calendar-cancelled.test.tsx`,
`test-harness/ui/fixtures/booking-history.json`.

Replaced: the three booking detail pages (admin/coordinator/portal — one new import + one component each),
`features/packages/{packages.schema,packages.query}.ts`, `features/packages/components/package-card.tsx`,
`app/(pages)/(protected)/staff/admin/packages/{page.tsx,new/page.tsx}`,
`features/staff-assignments/{staff-assignments.query,staff-assignments.types}.ts`,
`features/staff-assignments/components/staffing-calendar.tsx`,
`test-harness/run-route-tests.sh` (three new lines).

## Verified

- 16 new data-layer checks (`verify-booking-history` 11, `verify-calendar-cancelled` 5), plus the full existing
  suite: 111+83+29+15 = 238 data-layer checks total, all passing.
- 26 new route-level checks (history 7, packages 7, vendors already covered in Batch 1), full route regression:
  56+56+21+12+7+7 = 159, all passing.
- 18 new UI tests (history 5, packages-admin 7, calendar-cancelled 6), full UI regression: 150 tests across 9
  files, all passing.
- `tsc --noEmit` clean.
- Reverted every new guarantee on purpose (history excludes FAILURE entries, history scoping by bookingId,
  history excludes other modules, calendar includes cancelled events, cancelled events carry no staffing
  figures, the package schema fix) — each reversion was caught by a test, then restored and reconfirmed clean.

## Nothing to do after installing

No schema change, no migration, no new environment variable.
```bash
npx tsx prisma/verify-booking-history.ts        # 11 passed
npx tsx prisma/verify-calendar-cancelled.ts      # 5 passed
bash test-harness/run-route-tests.sh             # includes the 14 new route checks
npx vitest run                                   # includes the 18 new UI tests
```
