# Login portals — staff only at /staff-login, clients only at /sign-in

## The rule

| Account role | May sign in at | Lands on |
|---|---|---|
| CLIENT | `/sign-in` | `/portal` |
| ADMIN | `/staff-login` | `/staff/admin` |
| COORDINATOR | `/staff-login` | `/staff/coordinator` |
| VENDOR | `/staff-login` | `/staff/vendor` |

Before this change nothing checked it: an admin could type their username into the client `/sign-in` form and get in.

## How it works

1. The user submits either login page; Clerk signs them in.
2. Inside `finalize`, **before navigating**, the page calls `POST /api/auth/portal-check { portal: "client" | "staff" }` with the fresh session token.
3. The server compares the portal with the account's role **from the database** (not the session token, which can lag):
   - **match** → `200 { ok, destination }`; the page goes to the dashboard the server names.
   - **mismatch** → `403 WRONG_PORTAL`; the server **revokes the session at Clerk** and writes a failed-LOGIN audit entry, e.g. `ADMIN account attempted the client sign-in — refused, session revoked` (role only, no name). The page shows which login to use and signs the browser out.
   - **deactivated account** → `403 ACCOUNT_DEACTIVATED`, revoked and audited, even at the right portal.
4. **Fails closed:** if the check itself errors (network, 500), the page signs the browser out and asks the user to retry — a login is never let through unchecked.

Also in `proxy.ts`: a **signed-in** visitor on `/sign-in`, `/sign-up`, `/staff-login` (and sub-paths such as `/sign-in/sso-callback`) is redirected to their own dashboard. Skipped when the role is unknown (your `/staff` and `/portal` pages bounce unknown roles between them, so redirecting them would loop). `/forgot-password` is left alone.

## What the audit trail shows

A wrong-portal attempt produces two entries: Clerk's webhook records `<ROLE> signed in` (the credentials were valid), then `LOGIN / FAILURE — <ROLE> account attempted the <portal> sign-in — refused, session revoked`. If Clerk could not be reached, the second entry says *refused* without "session revoked" and its metadata has `sessionRevoked: false`.

## Limits — state these in the thesis

- **This is a login-page policy, not the authorization boundary.** Clerk sessions work across the whole app. Someone who signs in by calling Clerk's API directly (skipping our page) is not stopped by this check — but they are still limited by the role check on every route, so they gain nothing they were not entitled to. Closing that gap would need a signed "passed the portal check" cookie required by the proxy; not built.
- **Revocation is not instant.** Clerk's short-lived session token stays valid for up to about a minute after the session is revoked. That is why the page also signs the browser out immediately.
- The check runs at **login only**. Sessions that were already signed in before this change are unaffected.

## Manual test (needs your real Clerk — I could only test with Clerk stubbed)

1. Sign in as a **client** at `/sign-in` → lands on `/portal`. ✔
2. Sign in as **admin**, **coordinator**, **vendor** at `/staff-login` → land on their own dashboard. ✔
3. Sign in as **admin** at `/sign-in` → the page says "This is the client sign-in. Staff accounts sign in at the staff login"; you stay on the page, signed out. Audit trail shows the two entries above. ✔
4. Sign in as a **client** at `/staff-login` → refused the same way, pointing at `/sign-in`. ✔
5. While **signed in** as any role, open `/sign-in`, `/staff-login` and `/sign-up` → straight to your dashboard, no login form flash. ✔
6. Deactivate an account in Admin → Users, then sign in with it → "This account has been deactivated". ✔
7. Sign out, open `/sign-in` → the form shows normally. ✔

**One thing to watch in step 3:** the browser should never briefly show the staff dashboard. If it does (Clerk refreshing the route before our check finishes), tell me and I will change how the redirect and check are ordered.
