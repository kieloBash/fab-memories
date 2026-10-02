<!-- tests/session-lifetime.e2e.md -->
# E2E — Session lifetime (managed by Clerk)

**Goal:** show that an ended Clerk session sends the user back to the right login page with a clear message, and
that the app itself never cuts a valid session short.

**Setup:**
- The site running (`npm run dev` or the live URL) and access to the Clerk Dashboard of the instance it uses.
- Accounts: a staff account at `/staff-login` (e.g. `admin`) and a client account at `/sign-in`.
- No `SESSION_MAX_AGE` in `.env` / Vercel (it is no longer read; remove it if present).

Tick ✓ or ✗ and write what you saw in Notes.

## A. A valid session is left alone

| # | Steps | Expected | ✓ | Notes |
|---|---|---|---|---|
| A1 | Sign in as staff, use the dashboard for a few minutes | Works normally; no redirects | ☐ | |
| A2 | Close the tab, come back later (within Clerk's maximum lifetime), open `/staff/admin` | Still signed in | ☐ | |

## B. Clerk ends the session — staff

| # | Steps | Expected | ✓ | Notes |
|---|---|---|---|---|
| B1 | Signed in as staff with the dashboard open. In Clerk Dashboard → Users → that user → Sessions → **Revoke** the session | — | ☐ | |
| B2 | Back in the app, click to another page (e.g. Bookings) | Lands on `/staff-login` | ☐ | |
| B3 | Same, but stay on the open page and trigger a data refresh (change a filter or tab) | Sent to `/staff-login` **once**, with the message "You've been signed out. Please sign in again." — no pile of error toasts | ☐ | |
| B4 | Look at the address bar | `?error=SESSION_ENDED` has been removed | ☐ | |
| B5 | Sign in again | Back on the dashboard | ☐ | |

## C. Clerk ends the session — client

| # | Steps | Expected | ✓ | Notes |
|---|---|---|---|---|
| C1 | Signed in as a client on `/portal`. Revoke the session in the Clerk Dashboard | — | ☐ | |
| C2 | Open "My bookings" or refresh a list | Sent to `/sign-in` with "You've been signed out. Please sign in again." | ☐ | |

## D. Removed custom behaviour stays removed

| # | Steps | Expected | ✓ | Notes |
|---|---|---|---|---|
| D1 | Signed out, open `/staff-login?error=SESSION_EXPIRED` | Generic "We couldn't verify your account just now…" message (the code is no longer special); nothing else happens | ☐ | |
| D2 | Signed in, in the browser console: `fetch('/api/auth/session-expired', { method: 'POST' }).then(r => r.status)` | `404` — the endpoint no longer exists | ☐ | |

## E. Optional — Clerk's own timeout

| # | Steps | Expected | ✓ | Notes |
|---|---|---|---|---|
| E1 | Development instance only: Clerk Dashboard → Sessions → set a short inactivity timeout (if your plan offers it). Sign in, wait past it, click something | Same result as B3 | ☐ | |
| E2 | Set the timeout back afterwards | — | ☐ | |

## F. Automated

| # | Command | Expected | ✓ | Notes |
|---|---|---|---|---|
| F1 | `npx vitest run test-harness/unit/signed-out-redirect.unit.test.ts test-harness/ui/proxy.test.tsx test-harness/ui/login-portal.test.tsx` | All pass | ☐ | |
