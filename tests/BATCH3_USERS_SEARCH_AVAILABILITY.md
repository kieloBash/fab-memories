# Batch 3 — user accounts, coordinator booking search, coordinator availability

Three PRD items (FR-02/05, FR-14, B-04), plus two real bugs found while building item 3.

## FR-02 / FR-05 — Admin user accounts page

Replaces the "coming soon" placeholder with a working page: a table of every staff account (name, username,
role, status), a create dialog, and per-row Edit / Deactivate / Reactivate.

### Two real bugs, caught and fixed

1. **No self-protection.** An admin could change their own role or deactivate their own account through this
   endpoint — a one-click lockout with no recovery path. `PATCH` now refuses both; `DELETE` refuses
   self-deactivation. (Editing your own full name is still allowed.)
2. **No last-admin protection.** Nothing stopped demoting or deactivating the *only* active admin, at which
   point no one left could fix it. Both routes now check, before writing anything, whether the change would
   leave zero active admins — and refuse if so.
3. **Reactivating never unlocked Clerk.** `DELETE` (deactivate) correctly calls Clerk's `lockUser`. But setting
   `isActive: true` back on a deactivated account never called `unlockUser` — so a "reactivated" account in the
   database still could not sign in. Fixed: `PATCH` now calls `lockUser`/`unlockUser` to match the `isActive`
   transition in both directions.

Both routes also gained proper Zod validation (they previously did raw, partial manual checks) — including
refusing `role: "CLIENT"` on this staff-only endpoint.

## FR-14 — Coordinator booking list and search

`GET /api/bookings` already supported `status`/`eventType`/`from`/`to` for both ADMIN and COORDINATOR — only
the coordinator **list page** was missing (the nav link was commented out). Also added: a `search` filter
(client name or venue, case-insensitive, server-side).

The admin bookings page (grid + calendar views, status filter) is now `BookingsListView`, one shared component
taking a `basePath` prop, used by both `/staff/admin/bookings` and the new `/staff/coordinator/bookings`. Search
is debounced client-side (300ms) so typing doesn't fire a request per keystroke.

## B-04 — Coordinator availability

New: a coordinator marks single calendar days unavailable, with an optional reason, on `/staff/coordinator/availability`.
**Assigning that coordinator to a booking on that date is refused (409, no override)** — enforced inside
`POST /api/bookings/[id]/staff`, the same route that already does the (non-blocking) scheduling-conflict check.
The blocked attempt is itself audited.

Marking a day that already has a live assignment **succeeds**, but is flagged `conflictsWithAssignment: true` so
the page can show a warning ("you already have an assignment — let an admin know") rather than silently
double-booking or blocking a legitimate leave request.

New database table — see "Database" below.

## Files

New: `features/staff-accounts/**`, `features/availability/**`,
`app/api/staff-accounts/**` (route hardening, in place), `app/api/staff/availability/**`,
`app/(pages)/(protected)/staff/admin/users/page.tsx` (replaces the placeholder),
`app/(pages)/(protected)/staff/coordinator/{bookings,availability}/page.tsx`,
`features/bookings/components/bookings-list-view.tsx`,
`prisma/verify-{staff-accounts,availability,booking-search}*.ts` (data-layer + via test-harness/),
`test-harness/clerk-client.stub.ts` (Clerk is now stubbed for route tests, alongside the existing auth stub),
`test-harness/ui/{staff-accounts,availability,bookings-list-view}.test.tsx`.

Replaced: `app/api/staff-accounts/route.ts` and `[id]/route.ts` (validation + the three fixes above),
`app/api/bookings/route.ts` / `bookings.query.ts` / `bookings.schema.ts` (search),
`app/(pages)/(protected)/staff/admin/bookings/page.tsx` (now a thin wrapper),
`app/(pages)/(protected)/staff/layout.tsx` (nav: Bookings + My availability enabled for coordinators),
`app/api/bookings/[bookingId]/staff/route.ts` (the unavailability gate),
`features/layouts/components/nav-icons.ts` (registered the CalendarOff icon),
`test-harness/run-route-tests.sh` (now also swaps `lib/clerk/client.ts`, plus 5 new test files).

## Database

Adds one table. **Apply this before installing the code.**

```prisma
// Add to the User model's relations:
  unavailability   CoordinatorUnavailability[]

// Add as a new model:
model CoordinatorUnavailability {
  id            String   @id @default(cuid())
  coordinatorId String
  coordinator   User     @relation(fields: [coordinatorId], references: [id])
  date          DateTime @db.Date
  reason        String?
  createdAt     DateTime @default(now())

  @@unique([coordinatorId, date])
  @@index([date])
}
```

Migration `prisma/migrations/20260922000000_coordinator_unavailability/` is included (standard Prisma-generated
SQL — this is an ordinary table, nothing hand-written like Module 9's partial index).

```bash
# paste the schema addition above into prisma/schema.prisma, then:
npx prisma migrate dev
npx prisma generate
```

## Testing Clerk-calling routes (new)

Item 3's routes call Clerk (`createUser`, `updateUserMetadata`, `lockUser`, `unlockUser`). `run-route-tests.sh`
now also backs up and swaps `lib/clerk/client.ts` with `test-harness/clerk-client.stub.ts` (an in-memory fake
that records call counts) for the duration of the run, restoring the real file afterward — same pattern already
used for `lib/clerk/auth.ts`.

## Verified

- 30 new data-layer checks (availability 15, booking-search 5, vendors/history/calendar unchanged from Batch 2),
  full data-layer regression: 274 checks total, all passing.
- 41 new route-level checks (staff-accounts 27, availability 11, booking-search 3), full route regression:
  9 suites / 200 checks, all passing.
- 25 new UI tests (staff-accounts 11, availability 7, bookings-list-view 5, plus users/booking search coverage),
  full UI regression: 173 tests across 12 files, all passing.
- `tsc --noEmit` clean.
- Reverted every new guarantee on purpose: availability idempotency (crashes with a unique-constraint error,
  confirming duplicates are truly prevented), availability delete no longer scoped to the owner, last-admin
  protection removed, the assignment gate removed — each was caught, then restored and reconfirmed clean.

```bash
npx tsx prisma/verify-availability.ts       # 15 passed
npx tsx prisma/verify-booking-search.ts     # 5 passed
bash test-harness/run-route-tests.sh        # 9 suites, 200 passed
npx vitest run                              # 173 passed
```
