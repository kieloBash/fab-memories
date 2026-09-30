<!-- docs/email/README.md -->
# Email — Gmail sending, HTML templates and delivery checks

Fab Memories sends email through **Gmail with Nodemailer** — the same approach as LiveAdmin. Every email has an
HTML version (Fab Memories branding) and a plain-text version, and every attempt is recorded in the **EmailLog**
table so you can prove an email was really sent.

## What sends email

| Kind (EmailLog `kind`) | When | Template |
|---|---|---|
| `BOOKING_CONFIRMED` | Deposit verified, cash deposit recorded, or booking confirmed by staff | `booking-status.ts` |
| `BOOKING_RESTORED` | Staff decline a client's cancellation request (booking stays confirmed) | `booking-status.ts` |
| `BOOKING_CANCELLED` | Staff cancel or decline a booking (with the reason) | `booking-status.ts` |
| `PAYMENT_VERIFIED` | Any payment verified (deposit, installment, full balance) or recorded by staff | `payment.ts` |
| `PAYMENT_FLAGGED` | Staff flag a payment (with their note) | `payment.ts` |
| `PAYMENT_SUBMITTED` | A client submits payment proof → sent to staff | `notification.ts` (generic) |
| `TEST` | Administrator test email | `notification.ts` |

All values typed by users (names, venues, notes) are HTML-escaped.

## Files

| File | Purpose |
|---|---|
| `lib/email/send.ts` | The only sender. Picks Gmail OAuth2 → Gmail App Password → console log; records every attempt in EmailLog; never throws. |
| `lib/email/templates/*` | `layout.ts` (frame, escaping, buttons), `booking-status.ts`, `payment.ts`, `notification.ts`, `index.ts` |
| `lib/email/client-emails.ts` | Booking-confirmed and payment-verified emails |
| `lib/notifications/notify.ts` | In-app notice + email (generic template unless a ready-made one is passed) |
| `app/api/admin/email/test/route.ts` | `POST` — ADMIN sends a test email and sees the result |
| `app/api/admin/email/log/route.ts` | `GET` — ADMIN reads the EmailLog |
| `prisma/schema.prisma` + `prisma/migrations/20260930090000_email_log/` | New `EmailLog` table (`EmailStatus` = SENT / FAILED / LOGGED) |
| `scripts/email-preview.ts` | `npm run email:preview` → `email-previews/*.html` (open in a browser) |
| `scripts/send-test-email.ts` | `npm run email:test -- you@example.com` → one real email from your machine |

## 1. Choose a Gmail sign-in method

### Option A — OAuth2 (recommended, same as LiveAdmin)

1. **Google Cloud Console** → create a project → *APIs & Services* → *Library* → enable **Gmail API**.
2. *OAuth consent screen* → User type **External** → fill in the app name and your email → add the sending Gmail
   address as a **Test user**.
3. **Important:** set *Publishing status* to **In production**. While it says *Testing*, Google expires refresh
   tokens after 7 days and emails stop with `invalid_grant`. An unverified app in production is fine for your own account.
4. *Credentials* → *Create credentials* → **OAuth client ID** → *Web application* → Authorized redirect URI:
   `https://developers.google.com/oauthplayground`. Copy the **Client ID** and **Client secret**.
5. Open **https://developers.google.com/oauthplayground** → gear icon → tick *Use your own OAuth credentials* →
   paste the Client ID and secret.
6. In *Step 1*, enter the scope `https://mail.google.com/` → *Authorize APIs* → sign in with the **sending** Gmail account.
7. *Step 2* → **Exchange authorization code for tokens** → copy the **Refresh token**.
8. Values: `GMAIL_USER` (the sending Gmail), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`.

### Option B — App Password (quicker)

1. The sending Google account must have **2-Step Verification** on.
2. Google Account → *Security* → *2-Step Verification* → **App passwords** → create one (e.g. "Fab Memories").
3. Values: `GMAIL_USER` and `GMAIL_APP_PASSWORD` (the 16 characters; spaces are fine).

If both are set, OAuth2 is used. Optional: `EMAIL_FROM_NAME` (default "Fab Memories Events").

## 2. Try it on your machine

```bash
npm install
npx prisma generate
npm run email:preview                         # look at every template in the browser
# put the Gmail values in .env, then:
npm run email:test -- your.own@inbox.com      # prints the transport and { sent, messageId }
```

`Transport: console` means the Gmail values were not found.

## 3. Deploy

1. Apply the new table to the production database (uses `DIRECT_URL`/`DATABASE_URL` from `.env`):
   ```bash
   npx prisma migrate deploy
   ```
2. **Vercel → Settings → Environment Variables:** add the Gmail values from step 1 (Production). Remove any
   `SMTP_*` variables — they are no longer used.
3. Redeploy (push, or *Redeploy* in Vercel).

## 4. Check that emails are really sent (on the live site)

**Quick check (1 minute):** sign in as an administrator, open the browser console (F12) and run:

```js
await (await fetch("/api/admin/email/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: "your.own@inbox.com" }) })).json()
```

| Result | Meaning |
|---|---|
| `{ sent: true, mode: "gmail-oauth2", messageId: "<…>" }` | Working — check the inbox (and Spam). |
| `mode: "console"` | Vercel has no Gmail variables → set them and redeploy. |
| `sent: false, error: "invalid_grant"` | Refresh token expired or revoked → redo Option A steps 3–7. |
| `sent: false, error: "…Username and Password not accepted…"` | Wrong App Password or 2-Step Verification off. |

**See every email the system tried to send:**

```js
await (await fetch("/api/admin/email/log?limit=20")).json()
// filters: ?to=client@example.com  &kind=BOOKING_CONFIRMED  &bookingId=…  &since=2026-10-01T00:00:00Z
```

Each entry shows `status` (**SENT** = accepted by Gmail, **FAILED** = refused, with `error`, **LOGGED** = no
credentials), `mode`, `messageId` and time. The body is never stored.

**Automated check:** `npx playwright test e2e/specs/11-email.spec.ts` (see `docs/email/TEST.md`).

## Tests

- `test-harness/unit/email-send.unit.test.ts` — transport choice, EmailLog status, failures never throw, body not stored.
- `test-harness/unit/email-templates.unit.test.ts` — content, links, plain-text version, HTML escaping.
- `test-harness/integration/16-email.int.test.ts` — test route and log route, admin-only.
- `test-harness/integration/10-notifications.int.test.ts` — deposit verification sends both emails; flag does not send "verified".
- `e2e/specs/11-email.spec.ts` — TC-EMAIL-01 … 05 on the live site.
