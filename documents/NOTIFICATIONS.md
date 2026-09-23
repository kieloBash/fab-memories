# Notifications & email

In-app notifications (a real bell dropdown, replacing the "coming soon" placeholder) plus best-effort email via
Nodemailer. Covers FR-12, FR-15, FR-23, FR-27, FR-32 and NFR-03/24.

## What triggers a notification

| Event | Recipient | Where it's wired |
|---|---|---|
| Client submits payment proof | every active ADMIN + COORDINATOR | `POST /api/payments` |
| Staff flags a payment | the booking's client | `PATCH /api/payments/[id]/verify` (action=FLAG) |
| Staff cancels a booking | the booking's client | `PATCH /api/bookings/[id]` (status=CANCELLED) |
| Deposit / installment due within 48h, still unpaid | the booking's client | `POST /api/cron/due-date-reminders` (see below) |

Each call site builds `{ userId, type, title, body, link }` and calls `notify()` (or `notifyMany()` for the
first row) from `lib/notifications/notify.ts`. It is **awaited**, not fire-and-forget — matching how
`logAction()` already works elsewhere: "best-effort" means it never throws and never fails the business action,
not that the caller doesn't wait a few milliseconds for a database insert. (An earlier version used
fire-and-forget `void notify(...)`, which raced against the response and made results briefly unobservable —
including to a caller checking the outcome. Fixed before shipping.)

## Email

Plain text only — no HTML templates. `lib/email/send.ts` wraps Nodemailer:
- **`SMTP_HOST` set** → sends via that SMTP server (`SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
  `EMAIL_FROM`).
- **`SMTP_HOST` unset** (the default — dev, and every automated test) → logs the message to the console instead
  of sending. Nothing here ever needs real credentials to run or to be tested.
- A failed send is logged and swallowed; the in-app notification (already written) is unaffected.

## The bell (`features/layouts/components/NotificationBell.tsx`)

Polls `GET /api/notifications` every 30s (same pattern as the Module 8 dashboard). Shows the unread count as a
badge; the dropdown lists the latest 20, newest first. Clicking an unread one marks it read and, if it has a
`link`, navigates there. "Mark all read" only appears when something is unread. The component fetches its own
data — the `count` prop callers pass in is no longer used, so no other file needed to change.

## Due-date reminders (NFR-24)

`POST /api/cron/due-date-reminders` is not user-authenticated (a scheduler has no Clerk session) — it's guarded
by a shared secret:

```
Authorization: Bearer <CRON_SECRET>          (or  x-cron-secret: <CRON_SECRET>  header)
```

It refuses to run at all if `CRON_SECRET` is unset (never silently skips auth). It checks bookings with
`depositDueDate` and installments with `dueDate` inside the next 48 hours and still unpaid, and is **idempotent
per 20 hours** — running it again the same day does not duplicate a reminder for the same booking.

### Wiring it up on Vercel

Add to `vercel.json` (create it if you don't have one):
```json
{
  "crons": [{ "path": "/api/cron/due-date-reminders", "schedule": "0 9 * * *" }]
}
```
Vercel Cron calls the path with `Authorization: Bearer $CRON_SECRET` automatically once `CRON_SECRET` is set as
an environment variable — set the same value there and in your deployment's env vars. (Runs daily at 9am UTC;
adjust the cron expression for your timezone.)

## Database

One new table. **Apply before installing the code.**

```prisma
// Add to the User model's relations:
  notifications    Notification[]

// Add two new top-level declarations:
enum NotificationType {
  PAYMENT_SUBMITTED
  PAYMENT_FLAGGED
  BOOKING_CANCELLED
  PAYMENT_DUE_SOON
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id])
  type      NotificationType
  title     String
  body      String
  link      String?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  @@index([userId, isRead])
  @@index([createdAt])
}
```

Migration `prisma/migrations/20260923000000_notifications/` is included (standard Prisma-generated SQL).

```bash
npx prisma migrate dev
npx prisma generate
```

## Environment variables (all optional — omit them all and everything still works, via the console fallback)

| Variable | Purpose |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | your SMTP provider |
| `EMAIL_FROM` | the From address (default `no-reply@fabmemories.example`) |
| `CRON_SECRET` | required to call the due-date-reminders route at all |

## Scope cut for time — not built

- HTML email templates (plain text only)
- Pagination beyond the bell's latest 20
- A notification when a booking is *confirmed* or when a *cancellation request is declined* (only submit/flag/cancel/due-soon, per the original three-trigger scope)
- A "notification preferences" page (opt out of email, etc.)

## Verified

- 6 new data-layer checks (`verify-notifications.ts`), full data-layer regression: 280 checks total, all passing.
- 20 new route-level checks covering all three triggers end-to-end, the bell's three endpoints, and the cron
  route (auth, idempotency); full route regression: 10 suites / 210 checks, all passing.
- 7 new UI tests for the bell; full UI regression: 180 tests across 13 files, all passing.
- `tsc --noEmit` clean.
- Reverted three guarantees on purpose — `notify()` no longer catching errors, the cron secret check bypassed,
  mark-one-read no longer scoped to the caller — each was caught, then restored and reconfirmed clean.
- A real race condition was found and fixed while testing: routes originally called `notify()`/`notifyMany()`
  fire-and-forget (`void`), which could leave the database write still in flight when a caller checked the
  result. Switched to awaiting them, matching how `logAction()` is used everywhere else in the project.

```bash
npx tsx prisma/verify-notifications.ts      # 6 passed
bash test-harness/run-route-tests.sh        # 10 suites, 210 passed
npx vitest run                              # 180 passed
```
