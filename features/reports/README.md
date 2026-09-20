# Module 8 — Real-Time Reporting and Decision Support

> **Status: complete — data layer (Batch 1) + connected frontend (Batch 2).**
> Everything below is in the one cumulative zip: schema change, report queries, risk engine, API routes, CSV export,
> the screens that call them (dashboard panels, report pages, filters, charts, export), the vendor quotation input,
> seed, and three test suites.

Implements **FR-52 → FR-58** and **NFR-05**, and puts the thesis's central claim — *audit trail + real-time monitoring for proactive risk mitigation and decision support* — into working code.

---

## 1. What this module adds

| Piece | What it does |
|---|---|
| **Five reports** | Booking, Payment & transaction, Vendor coordination, Staff scheduling, Audit trail — each with summary figures, a paged table, filters, and CSV export |
| **Risk engine** | 14 rule-based indicators (High / Medium / Low) that turn live data into "what needs attention *now*" |
| **Dashboard (FR-58)** | Existing dashboard endpoint, extended with `recentAudit`, `risks` and `riskSummary` |
| **Audited access** | Every report view and every export is written to the hash-chained audit trail (FR-48) |
| **Vendor quotations (FR-54)** | Two nullable columns on `BookingVendor` so quotations can be recorded and reported |

No AI is involved (PRD non-goal): every alert is a plain query with a stated threshold you can explain to a panel.

---

## 2. Install

```bash
# 1. Copy the files in this zip over your project (paths match your tree).

# 2. Add two fields to model BookingVendor in prisma/schema.prisma
#    (after confirmedAt, before createdAt):
#
#      /// Module 8 (FR-54): the vendor's service quotation for this event.
#      quotationAmount Decimal? @db.Decimal(10, 2)
#      quotationNote   String?
#
#    The matching migration is already in the zip:
#    prisma/migrations/20260919090000_add_booking_vendor_quotation/

# 3. Apply it and regenerate the client
npx prisma migrate dev
npx prisma generate

# 4. (optional) convenient scripts — add to package.json "scripts":
#      "seed:reports":        "tsx prisma/seed-reports.ts",
#      "verify:reports":      "tsx prisma/verify-reports.ts",
#      "test:reports-routes": "bash test-harness/run-route-tests.sh",
#      "test:reports-ui":     "vitest run"
#
#    The UI tests need a test runner (dev-only, not shipped in your app):
#      npm i -D vitest@^3 jsdom @testing-library/react @testing-library/dom \
#               @testing-library/user-event @testing-library/jest-dom vite-tsconfig-paths
#      (add --legacy-peer-deps if npm reports a peer-dependency conflict)

# 5. Demo data + checks (use a DEV database)
npx tsx prisma/seed.ts              # your existing seed
npx tsx prisma/seed-reports.ts      # Module 8 scenarios
npx tsx prisma/verify-reports.ts    # 112 assertions — exits 1 on any failure
bash test-harness/run-route-tests.sh  # 56 route-level assertions (auth, validation, audit log, CSV, risk register)
npx vitest run                        # 38 UI tests — real components against real report payloads
```

Then sign in as `admin` and open **/staff/admin** (dashboard) and **/staff/admin/reports**.
Sign in as `coordinator` and open **/staff/coordinator/reports**.

`schema.prisma` is deliberately **not** overwritten by the zip, so you keep any changes you've made since you sent me the archive.

---

## 3. File map

```
features/reports/
├── reports.constants.ts      REPLACED  report catalogue, roles, thresholds, keys, routes
├── reports.types.ts          REPLACED  all report / risk / dashboard types
├── reports.schema.ts         NEW       Zod filters (shared by the API and the filter bar)
├── reports.dates.ts          NEW       Asia/Manila date helpers
├── reports.shared.ts         NEW       paging, meta, number helpers, chain-check cache   [server]
├── reports.booking.query.ts  NEW       FR-52                                             [server]
├── reports.payment.query.ts  NEW       FR-53                                             [server]
├── reports.vendor.query.ts   NEW       FR-54                                             [server]
├── reports.staff.query.ts    NEW       FR-55                                             [server]
├── reports.audit.query.ts    NEW       FR-56                                             [server]
├── reports.risk.ts           NEW       the risk engine                                   [server]
├── reports.query.ts          REPLACED  dashboard summary (FR-58), extended               [server]
├── reports.registry.ts       NEW       one definition per report: roles, query, CSV tables [server]
├── reports.export.ts         NEW       CSV builder (injection-safe, BOM)                 [server]
├── reports.logging.ts        NEW       de-duplicated VIEW / EXPORT / FAILURE audit logging [server]
├── reports.handler.ts        NEW       shared route logic (auth → validate → run → log → respond) [server]
├── reports.format.ts         NEW       display helpers (₱, Manila dates, badge variants)      [client]
├── reports.options.ts        NEW       filter dropdown options + which filters each report shows [client]
├── reports.api.ts            REPLACED  axios calls, blob download, blob-error unwrapping       [client]
├── reports.hooks.ts          REPLACED  React Query hooks; dashboard polls every 30 s          [client]
├── index.ts                  REPLACED  client-safe barrel only
├── components/
│   ├── report-page.tsx           one screen for all five reports (header, filters, export, view)
│   ├── report-catalog.tsx        the /reports landing page (cards, role-aware)
│   ├── report-filters-bar.tsx    date range + presets, per-report dropdowns, debounced search
│   ├── export-report-button.tsx  one button per exportable table
│   ├── report-ui.tsx             metric cards, section cards, generic table, pager, "built in N ms" footer
│   ├── charts.tsx                dependency-free bar / column charts
│   ├── risk-indicators-panel.tsx dashboard risk panel + "View all" register dialog
│   ├── recent-audit-feed.tsx     dashboard activity feed
│   ├── needs-attention-list.tsx  UNCHANGED (yours)
│   └── views/                    booking / payment / vendor / staff / audit report views
└── README.md                 this file

app/api/reports/
├── dashboard/route.ts        REPLACED
├── bookings/route.ts         NEW   ┐
├── payments/route.ts         NEW   │  one-line routes; all logic lives in reports.handler.ts
├── vendors/route.ts          NEW   │
├── staff/route.ts            NEW   │
├── audit/route.ts            NEW   ┘
├── risks/route.ts            NEW   full risk register (backs the dashboard's "View all")
└── [type]/export/route.ts    NEW   CSV export for every report

app/(pages)/(protected)/staff/
├── layout.tsx                     EDITED  one line: "Reports" added to the coordinator sidebar
├── admin/page.tsx                 EDITED  dashboard: + risk panel, + recent activity, + live stamp / refresh
├── admin/reports/page.tsx         REPLACED the "coming soon" placeholder with the report catalog
├── admin/reports/[type]/page.tsx  NEW
├── coordinator/reports/page.tsx           NEW
└── coordinator/reports/[type]/page.tsx    NEW  (audit → 404; API also 403s)

features/vendors/             vendors.schema.ts / vendors.query.ts / vendors.types.ts — quotation fields added
features/vendors/components/booking-vendor-panel.tsx   EDITED: quotation input + data-loss fix (see §7)
prisma/
├── migrations/20260919090000_add_booking_vendor_quotation/migration.sql
├── seed-reports.ts           demo scenarios + history + audit entries (+ optional bulk)
└── verify-reports.ts         112 data-layer assertions
test-harness/                 route-handler tests with a Clerk stub (NOT part of the app)
test-harness/ui/              38 component tests + real-data fixtures + README
vitest.config.ts              test runner config (only picks up test-harness/ui/**)
docs/MODULE_8_E2E_TEST.md     end-to-end test script
```

`[server]` files must never be imported from client components or re-exported from `index.ts`.

---

## 4. API reference

All routes are `GET`, return JSON (`Cache-Control: no-store`), and errors are `{ "error": string }`.

| Route | Roles | Notes |
|---|---|---|
| `/api/reports/dashboard` | ADMIN | Summary + `recentAudit` + `risks` (top 8) + `riskSummary` |
| `/api/reports/risks` | ADMIN | Full risk register (≤ 100 items), audit-chain check run fresh |
| `/api/reports/bookings` | ADMIN, COORDINATOR | FR-52 |
| `/api/reports/payments` | ADMIN, COORDINATOR | FR-53 |
| `/api/reports/vendors` | ADMIN, COORDINATOR | FR-54 |
| `/api/reports/staff` | ADMIN, COORDINATOR | FR-55 |
| `/api/reports/audit` | **ADMIN only** | FR-56 (matches FR-50) |
| `/api/reports/[type]/export` | same as the report | CSV, up to 10,000 rows |

Status codes: `401` signed out · `403` wrong role or deactivated account · `404` unknown report/table · `422` invalid filter · `500` generation failed (also logged as a FAILURE audit entry).

### Filters (query string)

| Param | Applies to | Meaning |
|---|---|---|
| `from`, `to` (`YYYY-MM-DD`) | all | **bookings / vendors / staff:** event date · **payments:** submission day · **audit:** log day (all Manila time) |
| `bookingStatus` | bookings, payments, vendors, staff | `PENDING` `CONFIRMED` `CANCELLED` `CANCELLATION_REQUESTED`. Vendors & staff default to *active* statuses (cancelled hidden) |
| `eventType` | bookings, payments, vendors, staff | `WEDDING` `DEBUT` `CORPORATE` `BIRTHDAY` `OTHER` |
| `paymentStatus` / `paymentType` / `paymentMethod` | payments | enum values |
| `vendorCategory` | vendors | e.g. `CATERING` |
| `compliance` | staff | `COMPLIANT` `UNDERSTAFFED` `OVERSTAFFED` |
| `userId` `module` `action` `status` `search` | audit | `search` matches the description |
| `page`, `pageSize` | all | default 1 / 25, max 200. **Summary figures always cover the full filtered set**, not just the page |

Empty values (`?bookingStatus=`) are treated as "not provided".

### Export

`GET /api/reports/<type>/export?<same filters>` → `text/csv; charset=utf-8`, filename `<type>-report-YYYY-MM-DD.csv`. Extra tables via `&table=`:

| Report | Default table | `table=` |
|---|---|---|
| bookings | bookings | — |
| payments | transactions | `outstanding` |
| vendors | assignments | `gaps` |
| staff | events | `coordinators` |
| audit | entries (with sequence + hash) | — |

### Response shape

Every report returns `{ meta, summary, rows, …extras }`. `meta` includes `durationMs` — the server-side generation time, kept as evidence for NFR-05. Dates in date columns are `"YYYY-MM-DD"` strings; timestamps are ISO-8601 UTC; money is a number in PHP.

---

## 4b. The screens

| URL | Who | What |
|---|---|---|
| `/staff/admin` | Admin | Existing dashboard **plus** the *Risk indicators* panel, *Recent activity* feed, a "Live · updated hh:mm:ss" stamp and Refresh button. Auto-refreshes every 30 s and when the tab regains focus |
| `/staff/admin/reports` | Admin | Catalog: 5 report cards |
| `/staff/admin/reports/{bookings,payments,vendors,staff,audit}` | Admin | Report page |
| `/staff/coordinator/reports` | Coordinator | Catalog: 4 cards (no audit) — new **Reports** sidebar item |
| `/staff/coordinator/reports/{bookings,payments,vendors,staff}` | Coordinator | Same pages; links go to the coordinator's own booking/payment screens |
| any booking → Vendor coordination panel | Admin, Coordinator | New **Quotation** row per vendor: *Record / Edit* dialog |

Every report page has: header with **Refresh** and **Export** buttons · a filter bar (date range with presets *Next 30 days / Last 30 days / This month*, report-specific dropdowns, debounced search on the audit report) · metric cards · charts · paged tables (scroll sideways on phones) · a footer showing *"Generated … · built in N ms · N matching rows"* — the NFR-05 evidence line.

Behaviours worth knowing:
- An impossible date range (from after to) is blocked **in the form** with a message; it never reaches the API.
- Changing any filter returns to page 1; the previous result stays on screen (dimmed) while the new one loads.
- Export buttons follow the current filters but ignore paging, name the file from the server's `Content-Disposition`, and show a toast. A server error on export is unwrapped to a readable message.
- The audit report opens on the **last 30 days**; the others open unfiltered.
- Charts are plain CSS — **no charting library was added** (see §7).

---

## 5. The reports

| Report | Summary figures | Extras |
|---|---|---|
| **Booking** | total; by status, event type, month; confirmed value & guests | — |
| **Payment** | transactions; verified / awaiting / flagged counts & amounts; verified by method and by type | **snapshot** (as of now, ignores date filter): outstanding total, overdue bookings, installment summary · **outstanding** table (100 most urgent) |
| **Vendor** | assignments; confirmed / contacted / not contacted; quotation total & count; by category | **gaps**: upcoming events with a requested category that has no confirmed vendor |
| **Staff** | events; compliant / understaffed / overstaffed; without backup; events with conflicts | **coordinators**: primary/backup load and conflict dates per coordinator |
| **Audit** | entries; failures; unique users; by module / action / Manila day; top users | **chain**: full hash-chain verification, run fresh on every request |

Notes:
- `proofType` is **derived** (screenshot / reference number / none) — the schema has no such column.
- For **FLAGGED** payments, `reviewedBy` is the person who *flagged* it (the existing flag route stores the flagger in `verifiedBy`).
- Reports never contain proof-image URLs, so an export can't leak access to payment proofs (NFR-20).
- Coordinators see all bookings' data, consistent with the existing `GET /api/bookings`.

---

## 6. The risk engine

Returned by the dashboard (`risks`, `riskSummary`); thresholds live in `RISK_THRESHOLDS` (`reports.constants.ts`).

| Kind | Fires when | Severity |
|---|---|---|
| `PROOF_UNVERIFIED` | payment SUBMITTED > **24 h** | Medium; **High** > 72 h |
| `PAYMENT_FLAGGED` | flagged, and no later SUBMITTED/VERIFIED payment for the same booking/type/installment | Medium; **High** ≥ 7 days |
| `DEPOSIT_OVERDUE` | PENDING booking, deposit due date passed, no deposit submitted or verified, event still ahead | High |
| `INSTALLMENT_OVERDUE` | UNPAID, past due, **no proof awaiting verification** | High |
| `FULL_BALANCE_OVERDUE` | CONFIRMED, FULL plan, due date passed, balance > 0, none awaiting verification | High |
| `CONFIRMED_WITHOUT_DEPOSIT` | CONFIRMED, event ahead, no VERIFIED deposit | High |
| `UNDERSTAFFED_IMMINENT` | CONFIRMED event within **30 days**, primary coordinators below the FR-37 minimum | High ≤ 7 days, else Medium |
| `VENDOR_GAP_IMMINENT` | CONFIRMED event within 30 days, requested category has no confirmed vendor | High ≤ 7 days, else Medium |
| `COORDINATOR_CONFLICT` | same coordinator on ≥ 2 CONFIRMED/PENDING events on one date | High |
| `CANCELLATION_PENDING` | client cancellation request unanswered | Medium; **High** > 72 h |
| `DOUBLE_CONFIRMED` | ≥ 2 CONFIRMED events on one date (FR-10 / NFR-31 violated) | High |
| `DATE_CONTENTION` | pending request on a date already confirmed → Medium · ≥ 2 competing pending → Low | Medium / Low |
| `AUDIT_FAILURES` | ≥ 3 FAILURE audit entries in 24 h | Medium; **High** ≥ 10 |
| `AUDIT_INTEGRITY` | hash chain broken (cached 5 min on the dashboard; fresh in the audit report) | High |

Sorted High → Medium → Low, then oldest / soonest first. `riskSummary` always counts *everything found*; the list is capped. If a rule hit its 200-row query cap, its kind appears in `cappedKinds` so the UI can show "200+" instead of a misleading exact number.

`CONFIRMED_WITHOUT_DEPOSIT` and `DOUBLE_CONFIRMED` exist because **nothing in the database prevents those states today** (see §8). The monitoring layer is your safety net until the constraints are added.

---

## 7. Design decisions worth knowing (and defending)

1. **Manila time everywhere.** `eventDate` is a Postgres `DATE` stored as UTC midnight. Comparing it with `new Date()` treats today's event as already past. All "today", "overdue" and day-filter logic uses `Asia/Manila` (fixed +08:00, no DST). See `reports.dates.ts`.
2. **De-duplicated view logging.** An identical view (same user, report, filters) is logged once per 10 minutes. Without this, the dashboard's polling wrote one audit row per poll. Every *distinct* access and *every* export is still recorded (FR-48).
3. **CSV injection protection.** Venue names, notes and descriptions are user-typed; a value starting with `= + - @` executes as a formula in Excel. Such strings are prefixed with `'`. A UTF-8 BOM is added so `₱` renders.
4. **Server modules are not `"use server"`.** That directive makes every export a callable server action with no auth check. Access control is in `reports.handler.ts`.
5. **Summaries are computed over the whole filtered set**, tables are paged. Page 2 never changes a total.
6. **One registry, one handler.** Adding a sixth report means one query function and one registry entry.
7. **No shared mutable state** besides the 5-minute chain-check cache (per server instance).
8. **No charting library.** The plan proposed the shadcn chart (recharts). recharts isn't in your project and every chart here is a ranked list or a short series, so I drew them in CSS instead: nothing to install, bundle or upgrade. Swap in recharts later if you need tooltips or zoom.
9. **The screens hold no business logic.** Severity, thresholds, overdue rules and totals are all decided server-side; the UI only formats and links. That is what lets the same numbers appear in the JSON, the CSV and the screen.

### Fixes to existing behaviour (done here because the dashboard needed them)
- Dashboard hid an event **on its own event day** (`eventDate >= now` compared a date to a timestamp).
- "Upcoming this week" count was **capped at 6** (counted after slicing the list).
- Dashboard **logged an audit entry on every poll** (see 2).
- **Vendor panel data loss.** "Mark confirmed" / "Mark contacted" sent one field and the update endpoint nulls whatever it isn't sent, so confirming a vendor **erased its contacted date and note**. Every update now resends the current record and changes only the intended field. (A regression test locks this in.)

---

## 8. Known limits & open items

| Item | Detail |
|---|---|
| **No DB constraint for one-confirmed-per-day** | NFR-31 still relies on application checks. The deposit-verify path and `PATCH /api/bookings/[id]` (confirm) don't re-check the date, and the confirm PATCH doesn't check the deposit. Seed scenarios **S10/S11** plant exactly these violations so you can watch the monitor catch them. A partial unique index (`WHERE status = 'CONFIRMED'`) is the real fix. Delete S10 from the seed when you add it (the seed skips it automatically if the insert fails). |
| **Vendor update semantics** | `PATCH /api/bookings/[id]/vendors/[vendorId]` still *replaces* contacted / confirmed / notes (omitted = cleared). The panel now always resends them, but any **other** caller must do the same. Making the endpoint partial-update would be safer but changes the "un-mark" behaviour, so I left it for you to decide. |
| **Documents nav** | The admin sidebar still lists *Documents* and its placeholder page (Module 6 was dropped). Remove them when you finalise the scope. |
| **Vendor quotation by vendors** | Quotations are typed in by staff. Vendors have no login, so they can't submit their own (FR-34's vendor-side flow is not built). |
| **Audit page vs audit report** | The existing audit page filters `to` by UTC day; the report uses Manila days. Same data, slightly different boundaries near midnight. |
| **Chain verification is O(n)** | ~ms at thesis scale (verified). Cached 5 min on the dashboard; fresh in the audit report. |
| **Exports** | CSV only, max 10,000 rows (`meta.truncated` says if cut). PDF was dropped with Module 6. |
| **Audit entries can't be deleted** | Re-running `seed-reports.ts` adds 4 more FAILURE entries each time (they're immutable by design). After ~3 runs the failure alert escalates Medium → High. Expected. |
| **Not covered** | Notifications/email (NFR-03, NFR-24), audit-write atomicity, failed-login capture — separate work. |

---

## 9. Verified

Run against a real PostgreSQL 16 built from your 16 migrations plus the new one:

| Check | Result |
|---|---|
| `tsc --noEmit` on the whole project | clean |
| `next build` (data layer) | compiles; all report routes registered |
| `verify-reports.ts` | **112 / 112** |
| Mutation tests (3 deliberate bugs) | each made the suite fail, then pass again once reverted |
| Audit tamper test (row edited in raw SQL) | detected, pinpointed to the exact sequence number, cleared after restore |
| Load (3,034 bookings, 4,543 payments) | every report ≤ 0.6 s; risk engine ≈ 0.2 s (limit: 10 s) |
| Route tests (`run-route-tests.sh`) | **56 / 56** — now includes the risk register |
| UI tests (`vitest run`) | **38 / 38** — real components rendering **real payloads** dumped from the seeded database |
| UI mutation tests (3 injected bugs: slower polling, export leaking paging, vendor data-loss) | each turned exactly the right test red |
| `next build` with the new pages | compiles; `/staff/admin/reports`, `/[type]`, `/staff/coordinator/reports`, `/[type]`, `/api/reports/risks` registered |

A UI test caught a real bug while I wrote it: my quotation validation used `x * 100` arithmetic, which rejects valid amounts (`10.12 × 100 = 1011.9999…`). It now validates the typed text, and the server schema was checked to accept/reject the same values.

**Not verified here:** behaviour behind real Clerk sessions and in a real browser. The UI tests run in jsdom (real components, real data, simulated DOM) — they don't check pixel layout, fonts or the phone-width appearance. Please look at each screen once by eye (E2E §9).

---

## 10. FR / NFR coverage

| Requirement | Status | Where |
|---|---|---|
| FR-52 Booking report | ✅ data layer | `reports.booking.query.ts` |
| FR-53 Payment & transaction report | ✅ data layer | `reports.payment.query.ts` |
| FR-54 Vendor coordination report | ✅ report + staff-entered quotations (dialog) | `reports.vendor.query.ts`, `booking-vendor-panel.tsx` |
| FR-55 Staff scheduling report | ✅ data layer | `reports.staff.query.ts` |
| FR-56 Audit trail report | ✅ data layer | `reports.audit.query.ts` |
| FR-57 Report export (Admin + coordinators) | ✅ CSV, from the screens | `reports.handler.ts`, `export-report-button.tsx` |
| FR-58 Real-time dashboard | ✅ data + recent audit + risks + 30 s auto-refresh UI | `reports.query.ts`, `risk-indicators-panel.tsx` |
| FR-48 (report accesses logged) | ✅ views + exports | `reports.logging.ts` |
| NFR-05 Reports ≤ 10 s | ✅ measured, `meta.durationMs` | verify script |
| Proactive risk mitigation (thesis objective 3) | ✅ 14 rules | `reports.risk.ts` |
