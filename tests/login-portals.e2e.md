# E2E — Login portals & redirects

**Setup:** `npm run dev` with the base seed loaded (`npx tsx prisma/seed.ts`). Use a private/incognito window, and sign out between cases.
Password for all seed accounts: `FabMemories123!`

| Account | Role | Login with |
|---|---|---|
| `anna.fabmemories@example.com` | CLIENT | `/sign-in` |
| `admin` | ADMIN | `/staff-login` |
| `coordinator` | COORDINATOR | `/staff-login` |
| `vendor` | VENDOR | `/staff-login` |

## A. Correct portal

| # | Steps | Expected | ✔ |
|---|---|---|---|
| A1 | Open `/sign-in` | Client page: "Welcome back", **Email address/username** field, links to Create an account and Staff sign-in | |
| A2 | Sign in as `anna.fabmemories@example.com` | Lands on `/portal`, sidebar shows "Client" | |
| A3 | Sign in as `client_anna` (username) at `/sign-in` | Lands on `/portal` | |
| A4 | Open `/staff-login`, sign in as `admin` | Lands on `/staff/admin` | |
| A5 | Sign in as `coordinator` at `/staff-login` | Lands on `/staff/coordinator` | |
| A6 | Sign in as `vendor` at `/staff-login` | Lands on `/staff/vendor` | |

## B. Wrong portal (refused)

| # | Steps | Expected | ✔ |
|---|---|---|---|
| B1 | At `/sign-in`, sign in as `admin` | Stays on `/sign-in`, signed out: "This is the client sign-in. Staff accounts sign in at the staff login (/staff-login)." The staff dashboard never flashes. | |
| B2 | At `/sign-in`, sign in as `coordinator` | Same as B1 | |
| B3 | At `/staff-login`, sign in as `anna.fabmemories@example.com` | Stays on `/staff-login`: "This is the staff sign-in. Client accounts sign in at the regular sign-in (/sign-in)." | |
| B4 | Admin → Audit trail | B1–B3 each show a `LOGIN / FAILURE … attempted the <portal> sign-in — refused` entry | |

## C. Signed-out access to protected pages

| # | Steps | Expected | ✔ |
|---|---|---|---|
| C1 | Signed out, open `/staff/admin` | Redirected to `/staff-login` (not `/sign-in`) | |
| C2 | Signed out, open `/staff/coordinator/calendar` | `/staff-login` | |
| C3 | Signed out, open `/portal/bookings` | `/sign-in` | |

## D. Signed-in cross-section access

| # | Steps | Expected | ✔ |
|---|---|---|---|
| D1 | As client, open `/staff/admin` | Back to `/portal` | |
| D2 | As coordinator, open `/portal` | Sent to `/staff/coordinator` (was `/staff`) | |
| D3 | As coordinator, open `/staff/admin` | `/unauthorized` with a "Back to your dashboard" link → `/staff/coordinator` | |
| D4 | As admin, open `/staff` | Straight to `/staff/admin`, with no "Loading your dashboard…" flash | |
| D5 | While signed in as any role, open `/sign-in` and `/staff-login` | Straight to that role's dashboard | |

## E. Sign out

| # | Steps | Expected | ✔ |
|---|---|---|---|
| E1 | As admin, click Sign out in the sidebar (expanded and collapsed) | Lands on `/staff-login` | |
| E2 | As client, click Sign out | Lands on `/sign-in` | |
| E3 | After E1/E2, press Back | Protected page is not shown; redirected to a login page | |

## F. Missing role claim (regression for the redirect loop)

Optional. Only do this on a dev Clerk instance.

| # | Steps | Expected | ✔ |
|---|---|---|---|
| F1 | Clerk Dashboard → Sessions → temporarily clear the custom session-token claim. Sign in as `admin` at `/staff-login` | Lands on `/staff/admin` (role read from the database). No `ERR_TOO_MANY_REDIRECTS`. | |
| F2 | Restore the claim `{ "metadata": "{{user.public_metadata}}" }` | — | |

## G. Deactivated account

| # | Steps | Expected | ✔ |
|---|---|---|---|
| G1 | Admin → User accounts → deactivate `vendor`, then sign in as `vendor` at `/staff-login` | "This account has been deactivated…", signed out | |
| G2 | Reactivate `vendor` | Can sign in again | |

## Automated

```bash
npx vitest run --project ui test-harness/ui/login-portal.test.tsx   # 20 tests
npx vitest run --project unit test-harness/unit/page-session.unit.test.ts  # 5 tests
npm test                                                            # full UI + unit suite
```
