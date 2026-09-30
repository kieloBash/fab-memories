<!-- docs/email/TEST.md -->
# Test guide — email sending

## A. Automated (Playwright, live site) — "was the email executed?"

```bash
npx playwright test e2e/specs/11-email.spec.ts --project=desktop-chrome
```

| Test | What it proves | Pass means |
|---|---|---|
| TC-EMAIL-01 | The server can send email at all | Test email accepted by Gmail (`mode` is gmail-…, not console; has a messageId) |
| TC-EMAIL-02 | Verifying a deposit triggers emails | EmailLog has **SENT** `BOOKING_CONFIRMED` and `PAYMENT_VERIFIED` for that booking |
| TC-EMAIL-03 | Flagging a payment triggers an email | EmailLog has **SENT** `PAYMENT_FLAGGED` |
| TC-EMAIL-04 | Declining a booking triggers an email | EmailLog has **SENT** `BOOKING_CANCELLED` |
| TC-EMAIL-05 | Only the administrator can use the email tools | Coordinator and client get 403 |

Failure messages tell you why: **LOGGED** = Gmail variables missing in Vercel; **FAILED** = Gmail refused (the
error is shown). Results go into `e2e/results/results.csv` with `npm run e2e:results`.

Give `E2E_CLIENT_EMAIL` a **real inbox** you can open, so you can also see the emails (item B3).

## B. Manual

| # | Check | Expected | ✓ |
|---|---|---|---|
| B1 | `npm run email:preview`, open each file in `email-previews/` | Pink Fab Memories header, details table, button; no broken layout | ☐ |
| B2 | Admin console: `POST /api/admin/email/test` to your inbox (README §4) | `sent: true`, gmail mode; email arrives | ☐ |
| B3 | Run TC-EMAIL-02 to 04, then open the test client's inbox | 4 emails: confirmed, payment verified, needs attention, cancelled — each with the right event and a working button | ☐ |
| B4 | Open one email on a phone | Readable without zooming; button easy to tap | ☐ |
| B5 | `GET /api/admin/email/log?limit=20` | Entries for B2 and B3 with status SENT | ☐ |
| B6 | Temporarily remove the Gmail variables (preview deployment only) and send a test | `mode: "console"`, log status LOGGED, and the booking action still succeeds | ☐ |

## C. Record for the paper

- **NFR-24 (Notification Delivery)** in the workbook's NFR Checks sheet: "Met — TC-EMAIL-01 to 04 passed; emails
  accepted by Gmail and recorded in the email log (date)".
- TC-FR12-02 and TC-FR12-04: the email part is proven by TC-EMAIL-02 and TC-EMAIL-04 — mark them Pass with a
  note referring to those tests.
