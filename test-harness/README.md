<!-- test-harness/README.md -->
# Fab Memories — automated test harness

Three layers of automated tests plus a guided manual test. All of them are **happy-path first**: they prove each feature works
end to end the way a real user would use it, and they pin down the business rules along the way.

| Layer | Folder | Runs against | What it proves | Command |
|---|---|---|---|---|
| **Unit** | `unit/` | Node, no DB | Schemas, the booking status gate, the audit hash chain and redaction, CSV, dates, RBAC, and two **contract checks**: client API ↔ route handlers, links ↔ pages | `npm run test:unit` |
| **UI** | `ui/` | jsdom | Real components: the user clicks through a dialog or form and the exact request (URL + body) is sent | `npm run test:ui` |
| **Integration** | `integration/` | **Real PostgreSQL** | The real route handlers, queries, transactions, audit chain and notifications, from request to database | `npm run test:int` |
| Legacy route scripts | `verify-*.ts` | Real PostgreSQL | The earlier Module 8–10 checks (kept as they were) | `npm run test:routes` |
| **Manual** | `../tests/INTEGRATION_AND_MANUAL_TEST_GUIDE.md` | The running app | Everything a person can see: layout, sign-in, Clerk, Supabase uploads, e-mail | — |

Current results are in [`FINDINGS.md`](./FINDINGS.md): **444/444 pass with `fixes/` applied; 9 fail on the original code,
one for each defect found.**

---

## 1. One-time setup

```bash
npm install                     # vitest, jsdom, Testing Library are already in devDependencies
```

UI and unit tests need nothing else. `npm test` runs them.

The **integration** tests need a PostgreSQL database that you are happy to write test rows to:

1. Create a separate database (recommended), or use your dev database. **Never production.**
2. Apply the migrations and the base seed to it:
   ```bash
   DATABASE_URL=<test-db-url> DIRECT_URL=<test-db-url> npx prisma migrate deploy
   DATABASE_URL=<test-db-url> npx tsx prisma/seed.ts                        # base seed (users, packages…)
   DATABASE_URL=<test-db-url> npx tsx prisma/seed.ts --with=reports,integrity   # optional: fuller dashboards
   ```
   The base seed creates Clerk users. For a database used **only** by the automated tests, you can seed offline:
   `SEED_CLERK_STUB=/tmp/clerk-stub.json npx tsx prisma/seed.ts` (those users cannot sign in to the UI, which the
   integration tests don't need).
3. Add to `.env`:
   ```bash
   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/fab_test   # OWNER role (cleanup needs DELETE)
   # optional — run the app side through the restricted role, like production:
   # TEST_RUNTIME_DATABASE_URL=postgresql://app_runtime:…@localhost:5432/fab_test
   ```

If `TEST_DATABASE_URL` is not set, a plain `npx vitest run` simply leaves the integration project out (and says so), so
UI + unit still run. When the integration tests *are* requested, the suite refuses to start if `TEST_DATABASE_URL` is missing, if the URL looks like production (`prod`, `production`, `live`),
or if the base-seed accounts are not there.

## 2. Commands

| Command | Runs |
|---|---|
| `npm test` | UI + unit (fast, no database) |
| `npm run test:int` | Integration (needs `TEST_DATABASE_URL`) |
| `npm run test:all` | All three projects |
| `npm run test:watch` | UI + unit in watch mode |
| `npx vitest run --project integration test-harness/integration/00-golden-path.int.test.ts` | One file |
| `npx vitest run -t "golden path"` | Tests whose name matches |
| `npm run test:routes` | The legacy route scripts (unchanged) |
| `npm run seed:testing` / `seed:testing:reset` | Manual-test scenarios T1–T6 |

## 3. What is covered

### Integration (`integration/`, 15 files, 123 tests)

| File | Feature | Happy path exercised through the real routes |
|---|---|---|
| `00-golden-path` | **Everything** | 24 steps: public packages → availability → client books → admin terms → deposit → verify (confirmed) → installments → pay/verify #1 → manual #2 → staff (lead + backup) → coordinator schedule/calendar → vendor directory, assign, quote, confirm, coverage → public vendor brief → cancellation request → declined → history timeline → notifications → audit trail + chain → reports + CSV → integrity → final cancellation |
| `01-packages` | Packages | create, list by role, edit, public listing, deactivate |
| `02-bookings` | Bookings | provincial pricing, client edit, view, staff filters, withdraw; staff terms, confirm, cancel + notification |
| `03-payments` | Payments | screenshot deposit + signed proof URL, verify → confirmed, full balance, filters, flag + client notice, manual cash / cheque |
| `04-installments` | Installments | schedule, pay, verify, reschedule keeping paid rows, manual installment |
| `05-staff-assignments` | Staff scheduling | roster, conflict check, assign, FR-37 compliance, update, calendar, remove, unavailability block |
| `06-coordinator-self-service` | Staff scheduling | my schedule, my dashboard, add/list/remove unavailable day |
| `07-vendors` | Vendors | directory CRUD; assign, contact → quote → confirm, coverage, client view, public brief, remove |
| `08-audit` | Audit trail | entry written, filters, paging, options, stats, chain verification |
| `09-reports` | Reports | all 5 reports (admin + coordinator), filters, CSV export ×5, dashboard, risk register |
| `10-notifications` | Notifications | due-date cron (+ e-mail, no duplicates), bell list, mark one, mark all |
| `11-staff-accounts` | User accounts | create → can use the app → edit role → deactivate → reactivate (Clerk calls checked) |
| `12-clerk-webhook` | Auth | signed `user.created` / `user.updated` events sync the database |
| `13-ownership` | Security | a client cannot reach another client's booking by any client route |
| `14-testing-seed` | Manual guide | every manual scenario T1–T6 can actually be played |

### Unit (`unit/`, 7 files, 92 tests)

`schemas` (every zod schema accepts a real payload; the rules hold) · `booking-transitions` (the status gate) ·
`audit-and-privacy` (hash chain, tamper detection, redaction) · `helpers` (RBAC, FR-37 ratios, Manila dates, CSV injection) ·
`api-contract` · `page-links` · `server-actions`.

The last three are **contract tests**. They read the source code, so they catch whole classes of bug that mocked tests cannot:
a client call to a URL the server does not serve, a link to a page that does not exist, a data module exposed as a Server Action.

### UI (`ui/`, 8 new files + the 13 existing)

`booking-actions` (confirm / cancel / cancel-request / withdraw dialogs, contract terms) · `payment-flows` (proof upload by
reference and by screenshot, verify / flag, installment schedule) · `directory-forms` (package form, vendor form) ·
`staff-scheduling` (staff panel, assign dialog, FR-37 banner, my assignments, roster) · `audit-screens` (stats, log table,
filters, chain check) · `small-components` · `display-and-landing`.

## 4. How the integration tests work

```
test-harness/integration/
├── _support/
│   ├── global-setup.ts   runs once: checks TEST_DATABASE_URL, refuses prod-looking URLs, checks the base seed
│   ├── setup.ts          runs before each file: points Prisma at the test DB, installs the mocks, cleans up afterwards
│   ├── mocks/            clerk-auth · clerk-client · storage · email · next-headers
│   ├── session.ts        actAs("admin") / actAs("client_anna") / signOut()
│   ├── http.ts           call(handler, { params, query, body }) → { status, json, text, headers }
│   ├── factories.ts      makeBooking / makeConfirmedBooking / makePayment / makeVendor / makePackage / uniqueEventDate
│   ├── steps.ts          storySteps(): later steps skip once one fails
│   └── cleanup.ts        removes everything tagged ITEST- (this run and any crashed run)
└── NN-feature.int.test.ts
```

**Only four things are mocked**, all of which would leave the machine: Clerk (who is signed in, and the Clerk backend API),
Supabase Storage (signed URLs, uploads), SMTP e-mail and `next/headers`. They are replaced with `vi.mock` inside Vitest, so
**no source file is ever swapped on disk** (unlike `run-route-tests.sh`), and an interrupted run cannot leave the real
`lib/clerk/auth.ts` replaced. Mocks record their calls (`clerkCalls()`, `storageLog`, `sentEmails`) so tests can assert on them.

**Test data.** Everything a test creates is tagged: booking venues, vendor and package names start with `ITEST-`, and
unavailability reasons with `ITEST`. Event dates are unique days in the 2080s, so the one-event-per-day index never collides
with real bookings. After each file, `cleanup.ts` deletes the tagged rows through the owner connection.

Two kinds of rows are **deliberately kept**:
- **Audit-log entries.** The trail is an append-only hash chain; deleting a row, or even nulling its `userId`, would break
  verification. Test entries are valid links in the chain, and `08-audit` checks that the chain still verifies.
- **User accounts** created by `11-staff-accounts` / `12-clerk-webhook` (`itest_*`, `user_itest*`). Deleting a user would
  null its audit rows, so they are left deactivated instead.

## 5. Writing a new test

**Integration** — copy this shape:

```ts
// test-harness/integration/15-my-feature.int.test.ts
import { POST } from "@/app/api/my-feature/route"
import { beforeAll, describe, expect, it } from "vitest"
import { makeConfirmedBooking, makePackage, seedUsers } from "./_support/factories"
import { call, expectStatus } from "./_support/http"
import { actAs } from "./_support/session"

describe("My feature", () => {
  let bookingId = ""
  beforeAll(async () => {
    const u = await seedUsers()
    bookingId = (await makeConfirmedBooking({ clientId: u.anna.id, packageId: (await makePackage()).id, adminId: u.admin.id })).id
  })

  it("ADMIN does the thing → 201", async () => {
    actAs("admin")
    const r = await call(POST, { params: { bookingId }, body: { … } })
    expectStatus(r, 201)            // failure message includes the response body
    expect(r.json).toMatchObject({ … })
  })
})
```

Rules of thumb: tag anything you create outside the factories with `ITEST-`; use `uniqueEventDate()` for event dates; never
delete audit rows; use `storySteps()` when tests depend on each other.

**UI** — `import "./module-mocks"` first, then `renderWithClient(<Component />)`. Use `routeGet({ "/url": data })` for GETs
(a function value receives the axios config, so one URL can answer by `params`). Set `mockApi.post.mockResolvedValue(...)` for
mutations, then assert `mockApi.post` was called with the exact URL and body.

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `TEST_DATABASE_URL is not set` | Add it to `.env` (section 1). |
| `The base seed is missing` | Run `npx tsx prisma/seed.ts` against the test database. |
| `User was denied access … (P1010)` in a one-off script | Scripts need `import "dotenv/config"`; `lib/prisma.ts` does not load `.env` itself. |
| Cleanup fails with permission denied | `TEST_DATABASE_URL` must be the **owner** role; put the restricted role in `TEST_RUNTIME_DATABASE_URL`. |
| `prisma migrate` cannot download engines (offline / proxy) | Apply `prisma/migrations/*/migration.sql` in order with `psql`; the app itself needs no engine binary (Prisma 7 + `pg` adapter). |
| A UI test says `Unmocked GET /…` | The component called a URL the test didn't route. Add it to `routeGet`; if the URL looks wrong, check it against `unit/api-contract`. |
| Golden path: steps skipped | Read the first failed step. Everything after it is skipped on purpose. |
