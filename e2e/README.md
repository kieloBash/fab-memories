<!-- e2e/README.md -->
# Fab Memories — Playwright end-to-end tests (live site)

Automated functional tests that drive a **real browser against the deployed system**
(default `https://fab-memories.vercel.app`). Every test title starts with its test-case ID from
`FabMemories_Functional_Test_Cases.xlsx` (e.g. `TC-FR10-02`), so a run can be copied straight into the workbook
and into Chapter 4.

How this relates to the tests you already have:

| Layer | Folder | Runs against | Command |
|---|---|---|---|
| Unit / UI / Integration (Vitest) | `test-harness/` | Node, jsdom, a **test** database | `npm test`, `npm run test:int` |
| **End-to-end (Playwright)** | `e2e/` | **The live deployment** — real Clerk, Supabase, Vercel | `npm run e2e` |

The Vitest suite proves the logic; this suite proves the deployed system works for real users.

---

## 1. What is covered

85 test cases in the workbook → **81 automated here**, 4 manual (§5).

| Spec file | Module | Test cases |
|---|---|---|
| `auth.setup.ts` | Signs in once per role through the real login pages | (supports TC-FR02-01) |
| `specs/01-auth.spec.ts` | 1 · Authentication & access control | FR01-01…03, FR02-01…03, FR03-01…04 (sign-up code, password reset), FR04-01, FR04-03, FR07-01 |
| `specs/02-bookings.spec.ts` | 2 · Booking & scheduling | FR04-02, FR09-01…02, FR10-01…02, FR11-01, FR12-01…04, FR13-01, FR14-01, FR15-01, FR16-01 |
| `specs/03-packages.spec.ts` | 3 · Service packages | FR17-01…02, FR18-01, FR19-01, FR20-01 |
| `specs/04-payments.spec.ts` | 4 · Payments & installments | FR21-01…03, FR22-01…02, FR23-01…02, FR24-01…02, FR27-01…02, FR28-01, FR47-01 |
| `specs/05-vendors.spec.ts` | 5 · Vendors & event brief | FR29-01…02, FR30-01 *(not implemented)*, FR31-01…02, FR32-01…04, FR33-01, FR34-01…02, FR35-01 |
| `specs/06-staff.spec.ts` | 6 · Staff scheduling | FR36-01, FR37-01…03, FR38-01, FR39-01, FR40-01 |
| `specs/07-audit.spec.ts` | 7 · Audit trail | FR48-01, FR49-01…02, FR50-01…02, FR51-01…02 |
| `specs/08-reports.spec.ts` | 8 · Reports & dashboard | FR52-01…FR58-02 |
| `specs/10-ui-smoke.spec.ts` | NFR-11 / NFR-22 | Every main page of every role, on desktop **and** a phone screen |

Most business steps call the app's own `/api` routes **from inside a signed-in browser page** (the same requests
the screens send, with the real Clerk session). Screen-level steps cover the login forms, the payment-proof
upload, copying the vendor brief link, opening the brief with no account, role redirects and logout.
Every test saves a screenshot in the HTML report.

## 2. One-time setup

```bash
npm install                 # adds @playwright/test and @clerk/testing (already in package.json)
npm run e2e:install         # downloads the Chromium browser Playwright uses
cp e2e/.env.e2e.example e2e/.env.e2e
```

### 2.1 Fill in `e2e/.env.e2e`

- `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — the same values as in Vercel. They are used only to get
  Clerk **testing tokens**, which let the automated browser past Clerk's bot protection.
- The five test accounts below.

### 2.2 Create the test accounts (once)

Use **dedicated** accounts, never real staff or clients.

| Variable | Role | How to create |
|---|---|---|
| `E2E_ADMIN_*` | Administrator | Users page (an existing admin creates it) |
| `E2E_COORDINATOR_*` | Coordinator | Users page |
| `E2E_COORDINATOR2_*` | Coordinator | Users page |
| `E2E_CLIENT_*` | Client | `/sign-up` with an e-mail like `e2e.client1+clerk_test@example.com` |
| `E2E_CLIENT2_*` | Client | `/sign-up` with `e2e.client2+clerk_test@example.com` |

Staff usernames should start with `e2e_` (the cleanup script recognises them).

### 2.3 Clerk test mode (for `+clerk_test` e-mails, TC-FR01-02 and TC-FR03-01…04)

With test mode on, any e-mail containing `+clerk_test` is verified with the code **424242** and no e-mail is sent.
- **Development instance** (publishable key starts `pk_test_`): test mode is on by default.
- **Production instance** (`pk_live_`): Clerk Dashboard → Settings → turn **Test mode** on while testing, and
  **off again before the survey** — Clerk warns against test mode on an instance with real customers.

If you prefer, create the two client accounts with real inboxes instead and leave `E2E_ALLOW_SIGNUP=false`.

## 3. Running

```bash
npm run e2e                                   # everything (≈ 10–15 min), desktop + mobile smoke
npx playwright test e2e/specs/04-payments.spec.ts   # one module
npx playwright test -g "TC-FR10"              # tests whose title matches
npm run e2e:ui                                # interactive mode: watch each step, re-run one test
npm run e2e:report                            # open the HTML report (screenshots = evidence)
```

Tests run **one at a time** (`workers: 1`) because they share one live database, and **never retry** —
a flaky pass would hide a real result.

Optional tests are skipped unless enabled in `e2e/.env.e2e`:
- `E2E_ALLOW_SIGNUP=true` → TC-FR01-02 and TC-FR03-01…04 (create throwaway clients through `/sign-up`, test the
  6-digit verification code — wrong code refused, correct code activates the account — and reset a password by code).
- `E2E_CRON_SECRET=<CRON_SECRET>` → TC-FR27-02 (runs the due-date reminder job).

## 4. Putting the results into the workbook and Chapter 4

```bash
npm run e2e:results        # → e2e/results/results.csv
```

The CSV has one row per test-case ID: **Status** (`Pass`, `Fail`, `Not implemented`, `Not tested`),
**Date Tested**, duration and the first line of any error. Copy Status and Date into the **Test Cases** sheet,
put "Playwright (automated)" in the Tester column, and use the screenshot names from the HTML report as Evidence.
The Summary sheet then fills in Table 4.x by itself.

For a failed case: record it honestly, fix the code, re-run that one test (`-g "TC-FR…"`), and note
"failed on <date>, fixed, passed on retest <date>" in Remarks — this goes into Table 4.x "Defects Found and Resolved".

## 5. Manual test cases

Run these by hand and record them in the workbook:

| Case | Why manual |
|---|---|
| TC-FR05-01 Lockout after repeated failed logins | Locking a real account from a script would block the test account; Clerk sets the threshold. |
| TC-FR06-01 Session ends after inactivity | Needs waiting for the Clerk session lifetime. |
| TC-FR08-01 Change own password | Changes the test account password the suite depends on. |
| TC-FR08-02 Weak password rejected | Done together with TC-FR08-01. |

Also check by eye, once, on a real phone: the vendor brief, the client portal and the payment page.

## 6. Known gaps found while writing the suite

These come from reading the code. The related tests are marked **not implemented** (`test.fixme`) or are expected
to **fail** until the gap is fixed or the requirement is reworded — do not "fix" the tests to make them pass.

| # | Requirement | Finding | Test |
|---|---|---|---|
| 1 | FR-30 — vendor availability for a date | No vendor availability calendar or date check in the code. | TC-FR30-01 (not implemented) |
| 2 | FR-17 / FR-18 — provincial price | Admin cannot set `priceProvincial` (not in the package form or API schema); only seeded packages have one. | TC-FR18-01 uses a seeded package; skipped if none has one |
| 3 | FR-12 — notify staff of new bookings | No notification type for new booking requests (only payments, flags, cancellations, due dates). | TC-FR12-01 expected to **fail** (notification part) |
| 4 | FR-31 — assign vendors to confirmed events | The assignment route does not check the booking status. | TC-FR31-02 expected to **fail** |
| 5 | FR-51 / FR-57 — export formats | Exports are CSV only (the instruction manual also mentions PDF). | Tested as CSV |
| 6 | FR-27 — due-date reminders | The reminder job exists, but nothing schedules it (no `vercel.json` cron). | TC-FR27-02 checks the job itself when `E2E_CRON_SECRET` is set |

## 7. Cleaning up the live database

Everything the suite creates is tagged with `E2E_TAG` (default `E2E-`): venues, vendor names, package names.
Test event dates are in 2029–2030, so they never block a date a real client could want.

```bash
npm run e2e:cleanup              # DRY RUN — lists what would be removed
npm run e2e:cleanup -- --apply   # deletes it
```

It uses `DATABASE_URL` (or `DIRECT_URL`) from `.env` — the **production** database when you test the live site,
so read the dry-run list first. What it does **not** remove, on purpose:
- **Audit-log entries.** The trail is a hash chain; deleting rows would break its verification. Test entries remain
  as ordinary, valid history.
- **User accounts.** `e2e_…` staff accounts are deactivated, not deleted. Remove test clients in the Clerk dashboard.
- **Payment-proof images.** The script prints their Supabase Storage paths; delete those files by hand.

**Order before the survey:** run the suite → fix and re-test failures → cleanup `--apply` → turn Clerk test mode off
→ start the evaluation. Do not run the suite during the evaluation period.

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `setup › sign in as …` fails, page stays on the login form | Wrong credentials in `e2e/.env.e2e`, or a client account used for a staff variable (the portal check refuses it). Open `npm run e2e:report` to see the screenshot and the red message. |
| Every login fails with a bot/captcha error | `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` missing or from a different Clerk instance. |
| API calls return 401 midway | The saved session expired. Delete `e2e/.auth/` and run again. |
| "Could not find a free test date" | The 2029–2030 range is busy with old test data — run the cleanup. |
| A locator times out | A label or layout changed. Run `npm run e2e:ui`, find the element with the picker, update the spec. |

## 9. For the paper (3.2.4 / 4.2.2)

> Functional testing combined automated end-to-end tests, written with Playwright and executed against the live
> deployment, with manual tests for cases that could not be automated safely (account lockout, session expiry,
> and password change). Each automated test corresponds to one test case in the functional test matrix and
> records a screenshot as evidence.
