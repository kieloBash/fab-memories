<!-- docs/fixes/TEST.md -->
# Test guide — scope-alignment fixes

Run on the deployed site after the deploy checklist in `README.md`. Use test accounts; for the e-mail checks,
the test client must have a real inbox you can open.

| # | Check | Steps | Expected | ✓ |
|---|---|---|---|---|
| 1 | Booking confirmed e-mail | As client, book an event and submit a deposit. As admin, verify the deposit. | Client receives **"Your booking is confirmed — Fab Memories Events"** and **"Payment verified — Fab Memories Events"** with a link to the booking. | ☐ |
| 2 | Decline / cancel e-mail (existing) | As admin, decline a pending booking with a reason. | Client receives the cancellation e-mail and an in-app notice. | ☐ |
| 3 | Kept-confirmed e-mail | As client, request cancellation of a confirmed booking. As admin, decline the request. | Client receives **"Your booking remains confirmed"**. | ☐ |
| 4 | Installment verified e-mail | Verify an installment payment. | Client receives **"Payment verified"**. | ☐ |
| 5 | Manual deposit e-mails | As admin, record a cash deposit on a pending booking. | Booking becomes Confirmed; client receives both e-mails from #1. | ☐ |
| 6 | Flag sends no "verified" e-mail | Flag a submitted payment. | Client gets the flag notice only, not "Payment verified". | ☐ |
| 7 | Event types — public | Open `/packages`. | Filter chips: All events, Wedding, Debut only; no Corporate/Birthday packages. | ☐ |
| 8 | Event types — forms | Open New booking (client), Edit booking, and New package (admin). | Only Wedding and Debut can be chosen. | ☐ |
| 9 | Event types — API | Send a booking or package with `eventType: "CORPORATE"` (Playwright TC-FR09-02 / TC-FR17-01 do this). | 422, "Only Wedding and Debut events can be booked" / "Packages can only be for Wedding or Debut events". | ☐ |
| 10 | Provincial pricing off | Open `/packages`; book with a venue outside Metro Manila. | No Metro Manila/Provincial switch; no "Provincial" badge; price = standard price; booking saved with isProvincial = false. | ☐ |
| 11 | FR-31 | Try to assign a vendor to a pending booking. | Refused: "Vendors can only be assigned to a confirmed booking." | ☐ |
| 12 | 404 on unassigned vendor | PATCH a vendor that is not assigned to the booking (Playwright TC-FR34-02). | 404, not 500. | ☐ |
| 13 | No Vendor role | Users → New account / Edit. | Role picker shows Admin and Coordinator only. | ☐ |
| 14 | Vendor pages closed | Signed in as admin, open `/staff/vendor`. | Redirected to `/unauthorized`. | ☐ |
| 15 | Wording | Open `/sign-in`, `/staff-login`, Users page, home page. | No mention of vendors signing in; vendor card says they receive a private event brief link. | ☐ |

Then re-run Playwright: `npx playwright test e2e/specs/01-auth.spec.ts e2e/specs/02-bookings.spec.ts e2e/specs/03-packages.spec.ts e2e/specs/05-vendors.spec.ts --project=desktop-chrome`.
