<!-- e2e/E2E_TEST.md -->
# Test guide — Playwright end-to-end suite

Use this checklist the first time you run the suite, and again before the final test run for Chapter 4.
Tick each box; write the result in the Notes column.

## A. Setup check

| # | Step | Expected | ✓ | Notes |
|---|---|---|---|---|
| A1 | `npm install` then `npm run e2e:install` | No errors; Chromium downloaded | ☐ | |
| A2 | `npm run typecheck:e2e` | Exits with no errors | ☐ | |
| A3 | `npx playwright test --list` | 94 tests in 10 files (81 test cases, 5 sign-in steps, 8 page-smoke runs) | ☐ | |
| A4 | `e2e/.env.e2e` filled in; the 5 test accounts exist and can sign in by hand | Each account reaches its own home page | ☐ | |
| A5 | Clerk test mode checked (§2.3 of the README) | On while testing, if `+clerk_test` e-mails are used | ☐ | |

## B. First run, one module at a time

Run each command, then open `npm run e2e:report`.

| # | Command | Expected | ✓ | Notes |
|---|---|---|---|---|
| B1 | `npx playwright test --project=setup` | 5 passed; `e2e/.auth/` has 5 files | ☐ | |
| B2 | `npx playwright test e2e/specs/01-auth.spec.ts --project=desktop-chrome` | All pass; TC-FR01-02 and TC-FR03-01…04 skipped unless `E2E_ALLOW_SIGNUP=true` | ☐ | |
| B3 | `… 02-bookings.spec.ts …` | All pass except the notification part of TC-FR12-01 (known gap #3) | ☐ | |
| B4 | `… 03-packages.spec.ts …` | All pass; TC-FR18-01 skipped if no seeded package has a provincial price | ☐ | |
| B5 | `… 04-payments.spec.ts …` | All pass; TC-FR27-02 skipped unless `E2E_CRON_SECRET` is set | ☐ | |
| B6 | `… 05-vendors.spec.ts …` | All pass except TC-FR31-02 (known gap #4); TC-FR30-01 **fixme** | ☐ | |
| B7 | `… 06-staff.spec.ts …` | All pass | ☐ | |
| B8 | `… 07-audit.spec.ts …` | All pass | ☐ | |
| B9 | `… 08-reports.spec.ts …` | All pass (TC-FR58-02 can take up to 45 s) | ☐ | |
| B10 | `npx playwright test e2e/specs/10-ui-smoke.spec.ts` | 8 passed (4 desktop + 4 mobile) | ☐ | |
| B11 | `… 12-scope.spec.ts …` | 6 passed — Wedding/Debut only, no Documents menu, old Documents URLs redirect | ☐ | |

If a test fails for a reason **other** than the known gaps, first look at its screenshot: a changed label means the
test needs updating; a wrong result means a real defect — record it (README §4).

## C. Evidence run for Chapter 4

| # | Step | Expected | ✓ | Notes |
|---|---|---|---|---|
| C1 | `npm run e2e` (full run) | Finishes; HTML report and `e2e/results/results.json` written | ☐ | |
| C2 | `npm run e2e:results` | `e2e/results/results.csv` with 81 rows; the console shows Pass / Fail / Not implemented / Not tested counts | ☐ | |
| C3 | Copy Status and Date Tested into the workbook's **Test Cases** sheet; Tester = "Playwright (automated)" | Summary sheet totals update | ☐ | |
| C4 | Run the 4 manual cases (README §5) and record them | Workbook complete for all 85 cases | ☐ | |
| C5 | Save the HTML report folder (`e2e/report/`) with the thesis files | Screenshots available for the appendix | ☐ | |

## D. Cleanup and hand-over to the survey

| # | Step | Expected | ✓ | Notes |
|---|---|---|---|---|
| D1 | `npm run e2e:cleanup` (dry run) | Lists only `E2E-` bookings, vendors and packages, and `e2e_` accounts | ☐ | |
| D2 | `npm run e2e:cleanup -- --apply` | "Done."; running D1 again lists 0 | ☐ | |
| D3 | Delete the listed payment-proof files in Supabase Storage | Folders gone | ☐ | |
| D4 | Remove test client accounts (`e2e.…+clerk_test@…`, including the throwaway sign-ups) in Clerk; turn Clerk test mode **off** | Only real accounts remain | ☐ | |
| D5 | Open the admin dashboard and calendar | No `E2E-` records visible | ☐ | |
| D6 | Audit trail → integrity check | Still **VALID** (audit entries were not deleted) | ☐ | |
