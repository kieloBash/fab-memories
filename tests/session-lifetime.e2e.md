# E2E — Session lifetime (`SESSION_MAX_AGE`)

**Setup:**

1. In `.env.local`, set `SESSION_MAX_AGE=2m` so a session expires quickly. Restart `npm run dev`.
2. Clerk Dashboard → Sessions → Maximum lifetime must be at least 2 minutes (Clerk's default is far longer).
3. Accounts: `admin` at `/staff-login`; `anna.fabmemories@example.com` at `/sign-in`. Password `FabMemories123!`.

After testing, set `SESSION_MAX_AGE=1d` (or remove it) and restart.

## A. Within the limit

| # | Steps | Expected | ✔ |
|---|---|---|---|
| A1 | Sign in as `admin`, click around for under 2 minutes | Everything works; no redirects | |
| A2 | Open `/staff-login` while still signed in | Straight to `/staff/admin` (not expired yet) | |

## B. Expiry on page navigation

| # | Steps | Expected | ✔ |
|---|---|---|---|
| B1 | Sign in as `admin`, wait about 3 minutes, click a sidebar link (for example Bookings) | Lands on `/staff-login` with **"Your session has expired. Please sign in again."**; `?error=` is removed from the address bar | |
| B2 | Press Back | Protected page not shown; sent to a login page | |
| B3 | Sign in again as `admin` | Works, lands on `/staff/admin` (the clock restarted) | |
| B4 | Repeat B1 as `anna` at `/sign-in` | Lands on `/sign-in` with the same message | |

## C. Expiry on an open screen (API calls)

| # | Steps | Expected | ✔ |
|---|---|---|---|
| C1 | Sign in as `anna`, open `/portal/payments`, leave the tab about 3 minutes, then refocus it or trigger a refetch | Sent to `/sign-in` with the expired message; no pile of error toasts | |
| C2 | DevTools → Network during C1 | One `401` response with `{"code":"SESSION_EXPIRED"}`, then `POST /api/auth/session-expired` → `200` | |

## D. Server-side end and audit

| # | Steps | Expected | ✔ |
|---|---|---|---|
| D1 | After B1, sign in as `admin` → Audit trail, filter module AUTH | Entry `LOGOUT … ADMIN session ended — older than the 2m maximum session age`, metadata `event: SESSION_EXPIRED`, `sessionRevoked: true` | |
| D2 | Clerk Dashboard → Users → admin → Sessions | The expired session shows as revoked/ended | |
| D3 | Expire a session with **two tabs** open, then refresh both | Only **one** audit entry for that session | |

## E. Cannot be abused

| # | Steps | Expected | ✔ |
|---|---|---|---|
| E1 | Freshly signed in, open `/sign-in?error=SESSION_EXPIRED` in the address bar | Redirected to the dashboard; still signed in; no audit entry | |
| E2 | Freshly signed in, DevTools console: `fetch('/api/auth/session-expired',{method:'POST'}).then(r=>r.status)` | `409`; still signed in | |

## F. Configuration

| # | Steps | Expected | ✔ |
|---|---|---|---|
| F1 | Set `SESSION_MAX_AGE=forever`, restart | Server log warns "not valid … using 1d"; sessions last 1 day | |
| F2 | Remove `SESSION_MAX_AGE` | 1 day (default) | |

## Automated

```bash
npx vitest run --project unit test-harness/unit/session-policy.unit.test.ts
npx vitest run --project unit test-harness/unit/session-expired-route.unit.test.ts
npx vitest run --project ui test-harness/ui/proxy.test.tsx test-harness/ui/login-portal.test.tsx
npm test    # full UI + unit suite
```
