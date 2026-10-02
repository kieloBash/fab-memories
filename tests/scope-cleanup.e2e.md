<!-- tests/scope-cleanup.e2e.md -->
# E2E test — Scope cleanup (Bundle 1)

**Goal:** prove that (a) only Wedding and Debut can be offered or booked, and (b) the document module is not
reachable from any role.

**Setup**
- Test database seeded fresh: `npx tsx prisma/seed.ts --fresh --all`
- `npm run dev`
- Accounts (seed password `FabMemories123!`): `admin`, `coordinator`, `client_ben`

Tick ✓ or ✗ and write what you saw in Notes.

## A. Seed data

| # | Actor | Step | Expected | ✓ | Notes |
|---|---|---|---|---|---|
| A1 | — | Read the seed output in the terminal | Packages: 2 Wedding + 2 Debut. No Corporate or Birthday line | ☐ | |
| A2 | — | Same output, bookings section | "Ben / Wedding +60d" (CONFIRMED) and "Ben / Debut +45d" (PENDING, deposit overdue) | ☐ | |
| A3 | — | `npm run scope:cleanup` | "No active out-of-scope packages"; out-of-scope bookings: 0 | ☐ | |

## B. Menus (desktop width, then phone width ~390 px)

| # | Actor | Step | Expected | ✓ | Notes |
|---|---|---|---|---|---|
| B1 | Admin | Sign in at `/staff-login` → look at the sidebar | Dashboard, Bookings, Payments, Packages, Vendors, Staff scheduling, Audit trail, Reports, User accounts — **no Documents** | ☐ | |
| B2 | Coordinator | Sign in → sidebar | No Documents entry | ☐ | |
| B3 | Client (Ben) | Sign in at `/sign-in` → sidebar | Home, My bookings, Payments, Account — **no Documents** | ☐ | |
| B4 | All three | Repeat B1–B3 at phone width (bottom tab bar) | No Documents tab | ☐ | |

## C. Old Documents URLs

| # | Actor | Step | Expected | ✓ | Notes |
|---|---|---|---|---|---|
| C1 | Admin | Type `/staff/admin/documents` in the address bar | Lands on `/staff/admin` (dashboard). No "coming soon" page | ☐ | |
| C2 | Coordinator | Type `/staff/coordinator/documents` | Lands on `/staff/coordinator` | ☐ | |
| C3 | Client | Type `/portal/documents` | Lands on `/portal` | ☐ | |
| C4 | Signed out | Open `/portal/documents` in a private window | Sent to `/sign-in` (login protection still applies) | ☐ | |

## D. Client home and landing page

| # | Actor | Step | Expected | ✓ | Notes |
|---|---|---|---|---|---|
| D1 | Client (Ben) | Open `/portal` | Four cards: Booking status, Next payment, Days to event, **Amount paid**. No "Documents ready" | ☐ | |
| D2 | Client (Ben) | Check the Amount paid value against the booking's verified payments | Equals the sum of VERIFIED payments on the booking shown under the cards (base seed only: ₱25,500 on Ben's Wedding) | ☐ | |
| D3 | Signed out | Open `/` and scroll the features and roles sections | No "Document generation" card; a "Real-time reports" card instead; client card has no "documents" wording | ☐ | |

## E. Event types and packages

| # | Actor | Step | Expected | ✓ | Notes |
|---|---|---|---|---|---|
| E1 | Client | `/portal/bookings/new` | Event type tiles: **Wedding** and **Debut** only | ☐ | |
| E2 | Client | Pick Debut → Choose a package | Only Debut packages listed (Elegant, Premiere) | ☐ | |
| E3 | Client | Open an existing PENDING booking → Edit | Event type options: Wedding and Debut only | ☐ | |
| E4 | Admin | `/staff/admin/packages` | Only Wedding and Debut packages | ☐ | |
| E5 | Admin | Packages → New package → Event type dropdown | Wedding and Debut only | ☐ | |
| E6 | Signed out | `/packages` (public catalog) → filter chips | All, Wedding, Debut | ☐ | |
| E7 | Admin | Reports → Bookings report → Event type filter | Wedding and Debut only | ☐ | |

## F. API (browser dev tools console while signed in, or the Playwright spec)

| # | Actor | Step | Expected | ✓ | Notes |
|---|---|---|---|---|---|
| F1 | Admin | `fetch('/api/packages').then(r=>r.json())` | Every item has `eventType` WEDDING or DEBUT | ☐ | |
| F2 | Client | `fetch('/api/packages?active=true').then(r=>r.json())` | Same | ☐ | |
| F3 | Admin | POST `/api/packages` with `eventType: "CORPORATE"` | **422**, "Packages can only be for Wedding or Debut events" | ☐ | |
| F4 | Client | POST `/api/bookings` with `eventType: "BIRTHDAY"` | **422**, "Only Wedding and Debut events can be booked" | ☐ | |

## G. Live database (after deploying)

| # | Actor | Step | Expected | ✓ | Notes |
|---|---|---|---|---|---|
| G1 | Developer | `npm run scope:cleanup` with the live `DATABASE_URL` | Lists the active Corporate/Birthday packages it would deactivate and the out-of-scope bookings | ☐ | |
| G2 | Developer | `npm run scope:cleanup -- --apply` | "Deactivated N package(s) and wrote one audit entry" | ☐ | |
| G3 | Admin | Audit trail → All entries, newest first | One entry "System scope cleanup deactivated N out-of-scope package(s)…" with no user | ☐ | |
| G4 | Admin | Audit trail → System integrity → verify chain | Chain still valid after the new entry | ☐ | |
| G5 | Developer | Run `npm run scope:cleanup -- --apply` again | "No active out-of-scope packages — nothing to deactivate" | ☐ | |

## H. Automated

| # | Command | Expected | ✓ | Notes |
|---|---|---|---|---|
| H1 | `npx playwright test e2e/specs/12-scope.spec.ts --project=desktop-chrome` | 6 passed | ☐ | |
| H2 | `npx playwright test e2e/specs/02-bookings.spec.ts e2e/specs/03-packages.spec.ts` | Same results as before this bundle | ☐ | |
| H3 | `npx playwright test e2e/specs/10-ui-smoke.spec.ts` | All pages still render | ☐ | |
