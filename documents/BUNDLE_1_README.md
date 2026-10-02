<!-- documents/bundles/BUNDLE_1_SCOPE_CLEANUP.md -->
# Bundle 1 — Scope cleanup

The thesis now covers **Wedding and Debut** events only, and **document generation is out of scope**
(listed in the delimitations, deferred to a future build). This bundle hides both everywhere a user or an
evaluator could run into them. No database schema change and no migration.

## What changed

### 1. Documents removed from every menu

| File | Change |
|---|---|
| `app/(pages)/(protected)/staff/layout.tsx` | Removed the admin "Documents" entry and the commented-out coordinator entry |
| `app/(pages)/(protected)/portal/layout.tsx` | Removed the client "Documents" entry (desktop sidebar and mobile tab bar both read this list) |
| `app/(pages)/(protected)/staff/admin/documents/page.tsx` | "Coming soon" placeholder → redirect to `/staff/admin` |
| `app/(pages)/(protected)/staff/coordinator/documents/page.tsx` | Placeholder → redirect to `/staff/coordinator` |
| `app/(pages)/(protected)/portal/documents/page.tsx` | Placeholder → redirect to `/portal` |
| `app/(pages)/(protected)/portal/page.tsx` | The "Documents ready: 0" card is replaced by **Amount paid** (sum of verified payments on the active booking); the empty-state text no longer mentions documents |
| `features/landing/components/FeaturesSection.tsx` | "Document generation" card → **Real-time reports**; payment card says "get an email when each payment is verified" instead of "receipts" |
| `features/landing/components/RolesSection.tsx` | Client card no longer says "download all your documents" |

The routes were kept as redirects, not deleted, so an old bookmark or a typed URL lands on the role's home page
instead of a 404.

**Also fixed while in these files:** the landing page said vendors "confirm availability and submit quotations"
through the system. That contradicts the delimitation (no vendor portal). The vendor feature card and the vendor
role card now describe the real flow: the coordinator records availability and quotations and shares a read-only
vendor brief link. Revert those two strings if you'd rather handle the vendor wording separately.

### 2. Corporate, Birthday and Other hidden

Most of this was already in place (`ACTIVE_EVENT_TYPES` in `features/bookings/bookings.constants.ts`, enforced by
the booking and package schemas, the booking forms, the package form and the public catalog). The gaps closed here:

| File | Change |
|---|---|
| `features/packages/packages.query.ts` | `getAllPackages()` returns Wedding and Debut packages only — for every role. Before, the logged-in `GET /api/packages` (admin catalog and booking form) still returned Corporate and Birthday packages |
| `features/reports/reports.options.ts` | The report filter's event-type dropdown lists Wedding and Debut only. The report API still accepts the old values so historical rows stay queryable |
| `prisma/seeds/01-base.ts` | Corporate and Birthday packages replaced by a **Premiere Debut Package**. Ben's Corporate booking → **Ben's Wedding** (Classic, ₱85,000, deposit ₱25,500). Ben's Birthday → **Ben's Debut** (Elegant, ₱65,000, deposit ₱19,500 — still overdue, still on the same date as Anna's Debut for the staff-conflict demo) |
| `prisma/seeds/02-reports.ts` | Scenarios S2, S5, S7, S9, S11 and the history/bulk generators now use Wedding and Debut only (amounts adjusted to those package prices; dates unchanged, so the one-confirmed-event-per-day index is still respected) |
| `test-harness/verify-package-routes.ts` | Its throw-away test package is a Debut package instead of Birthday |
| `tests/*.e2e.md` (4 files) | "Ben's Corporate / Ben's Birthday" renamed to "Ben's Wedding / Ben's Debut" to match the seed |

Nothing is deleted from the database. The enum values stay, so old Corporate/Birthday bookings still display with
their label.

### 3. New one-off script for the live database

`prisma/scripts/deactivate-out-of-scope-packages.ts` (also `npm run scope:cleanup`):

1. Sets `isActive = false` on every active Corporate, Birthday or Other package.
2. Writes **one** hash-chained audit entry for that change (system actor).
3. Lists — but does **not** change — bookings that still use an out-of-scope type.

```bash
npm run scope:cleanup              # dry run: shows what would change
npm run scope:cleanup -- --apply   # makes the change
```

Safe to run twice. Run it against the live database once this bundle is deployed.

### 4. Tests

| File | What |
|---|---|
| `e2e/specs/12-scope.spec.ts` | **New** Playwright spec, 6 cases (TC-SCOPE-01…06) |
| `e2e/E2E_TEST.md` | Row B11 added for the new spec |
| `tests/scope-cleanup.e2e.md` | Manual end-to-end checklist for this bundle |

## How to apply

1. Unzip over the project root (paths match the repo). `BUNDLE_1_README.md` and `bundle-1.patch` land in the root — delete them afterwards if you like.
2. `npm run typecheck && npm run lint`
3. Local check with a fresh test database: `npx tsx prisma/seed.ts --fresh --all`, then `npm run dev` and walk
   through `tests/scope-cleanup.e2e.md`.
4. Deploy to Vercel, then on the live database: `npm run scope:cleanup` (dry run) → `npm run scope:cleanup -- --apply`.
5. `npx playwright test e2e/specs/12-scope.spec.ts`

`bundle-1.patch` in the zip is the same change as a git diff (`git apply bundle-1.patch`) if you'd rather review
it line by line.

## Things to know

- **Existing out-of-scope bookings on the live site** still appear in bookings lists and reports. The script tells
  you how many there are. For the evaluation, the cleanest option is a freshly seeded database; the seeds now
  create Wedding and Debut data only. Never run `--fresh` against the live database.
- **`package-lock.json` is out of sync with `package.json`** in the uploaded repo (`npm ci` fails on missing
  `@emnapi/*` entries). Not caused by this bundle, but Vercel or a CI using `npm ci` will fail until you run
  `npm install` once and commit the lock file.
- Verified here: ESLint clean on the new files, `tsconfig.e2e.json` type-checks, and the UI/unit Vitest suites give
  the same result before and after the change. A full `tsc` could not be run in my sandbox because the Prisma client
  could not be generated offline — please run `npm run typecheck` on your machine.

## Thesis wording this supports

- **Scope:** "The system supports Wedding and Debut events."
- **Delimitation:** "Document generation (contracts, invoices, receipts and event checklists) is not included in
  this version and is recommended for future development."
