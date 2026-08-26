# Gaps, Open Questions & Client Clarifications
# Fab Memories Events — Real-Time Transaction Monitoring System

**Version:** 1.0
**Prepared By:** Development Team
**Purpose:** This document consolidates all identified gaps in the functional requirements, missing data definitions, unresolved business rules, and UI/UX decisions that must be clarified with the business owner before the affected modules are built. Every item here represents either a blocker or a significant risk to implementation if left unresolved.

---

## How to Use This Document

Each item is tagged with:
- **Module** — which system module it affects
- **Severity** — `Critical` (blocks implementation), `Significant` (creates ambiguity), `Minor` (low risk but should be defined)
- **Status** — `Open` / `Resolved`

Resolved items should have the answer filled in under the **Resolution** field before development of the affected module begins.

---

## Section A — Critical Gaps
> These block implementation. The affected module cannot be built correctly without answers.

---

### A-01 — Guest Data Input is Undefined
**Module:** Module 6 — Document Generation
**Severity:** Critical
**Status:** Open

**Problem:**
FR-43 says the system generates a Guest List (Alphabetical) and Guest List per Table Groupings — but there is no FR, data model, or workflow defined for how guest data enters the system in the first place. There is no `Guest` entity in the schema.

**Questions for the client:**
- Who is responsible for entering the guest list — the client, the coordinator, or both?
- What fields does a guest record contain? (e.g. full name, table number, meal preference, RSVP status, contact number, relationship to the couple/debutante)
- When is the guest list submitted — at booking, after confirmation, or closer to the event date?
- Can the guest list be updated after initial submission? If so, by whom and until when?
- For the "per Table Groupings" checklist — who assigns guests to tables, and how many guests per table is standard?
- Are the guest list checklists editable documents (filled in by the client through a form) or static PDF templates (filled in manually outside the system)?

**Resolution:**
> *(fill in after client discussion)*

---

### A-02 — Client-Side Booking Cancellation Policy is Undefined
**Module:** Module 2 — Event Booking and Scheduling
**Severity:** Critical
**Status:** Open

**Problem:**
FR-15 allows only the administrator or organizer to cancel a confirmed booking. There is no FR covering whether a client can initiate a cancellation request, and no business rule defined for what happens to verified payments already on record when a cancellation occurs.

**Questions for the client:**
- Can a client request a cancellation through the system, or is cancellation always initiated by the organizer?
- If a client can request cancellation, does the organizer need to approve it before the booking status changes?
- What is the refund or forfeiture policy when a confirmed booking is cancelled? (e.g. deposit is forfeited, partial refund, case-by-case)
- Should the system record a cancellation reason? Is the reason visible to the client?
- Are there any time-based rules — e.g. cancellations within 30 days of the event have a different policy?
- Should cancelled bookings remain visible in the client portal or be archived/hidden?

**Resolution:**
> *(fill in after client discussion)*

---

### A-03 — Installment Schedule Creation is Undefined
**Module:** Module 3 — Payment Processing
**Severity:** Critical
**Status:** Open

**Problem:**
FR-27 says the system tracks installment schedules "per contract terms" — but there is no FR defining who creates the schedule, when, what the structure is, or what happens when a due date passes without payment.

**Questions for the client:**
- Who creates the installment schedule — the administrator, or is it auto-generated from a fixed template?
- Is the installment structure fixed (e.g. always 3 installments: deposit, midpoint, final) or custom per booking?
- What are the standard installment terms? (e.g. 30% deposit, 40% at 60 days before event, 30% on event day)
- What is the minimum and maximum number of installments allowed?
- What happens when an installment due date passes without payment — does the system flag it, notify the client and admin, or both?
- Is there a grace period after the due date before it becomes overdue?
- Can the installment schedule be modified after it has been created? If yes, by whom?
- Should overdue installments be visible on the client portal?

**Resolution:**
> *(fill in after client discussion)*

---

### A-04 — Package Customization Structure is Undefined
**Module:** Module 2 — Service Package Management
**Severity:** Critical
**Status:** Open

**Problem:**
FR-19 says clients can customize their selected package and all customizations are recorded — but there is no definition of what "customization" means structurally. The current schema stores it as a plain text field, which is a placeholder.

**Questions for the client:**
- What does package customization mean in practice? Examples:
  - Adding optional services not in the base package?
  - Removing inclusions from the base package?
  - Upgrading specific line items?
  - Entering free-text special requests?
- Does the package have a defined list of optional add-ons with their own prices, or is customization purely a notes/request field?
- Does customization affect the total package price displayed on the invoice?
- Who can modify the customization after booking — only the client before confirmation, or also the coordinator after?

**Resolution:**
> *(fill in after client discussion)*

---

### A-05 — Client Self-Registration Flow is Undefined
**Module:** Module 1 — Authentication and Access Control
**Severity:** Critical
**Status:** Open

**Problem:**
FR-01 states only the administrator creates user accounts for coordinators, vendors, and clients. But FR-09 allows clients to submit booking requests — a client needs an account before they can book. It is unclear how a new client gets their account.

**Questions for the client:**
- Does every new client need to be manually registered by the administrator before they can use the system?
- Or should there be a self-registration page where a prospective client can create their own account?
- If self-registration is allowed: does the account need admin approval before it is activated?
- If admin-only registration: what is the workflow? Client contacts the business → admin creates account → client receives credentials via email?
- Should self-registered clients have a limited "pending" state until the admin approves their first booking?

**Resolution:**
> *(fill in after client discussion)*

---

### A-06 — Entourage List Checklist Fields are Undefined
**Module:** Module 6 — Document Generation
**Severity:** Critical
**Status:** Open

**Problem:**
The Entourage List is one of the eight auto-generated checklists (FR-43) but its fields and data source are completely undefined. Entourage lists for weddings and debuts are structurally different.

**Questions for the client:**
- What fields does a Wedding entourage list contain? (e.g. role, name, partner/pair name, attire color)
- What fields does a Debut entourage list contain? (e.g. role — escort, court, cotillion partner — name, attire)
- Who enters the entourage list — the client or the coordinator?
- Is the entourage list entered through a structured form in the system or is it an editable document template filled in outside?
- At what point in the booking lifecycle is the entourage list expected to be complete?

**Resolution:**
> *(fill in after client discussion)*

---

### A-07 — Crew Meal Breakdown Checklist Fields are Undefined
**Module:** Module 6 — Document Generation
**Severity:** Critical
**Status:** Open

**Problem:**
The Crew Meal Breakdown is one of the eight auto-generated checklists (FR-43) but its data source and structure are undefined.

**Questions for the client:**
- What does the Crew Meal Breakdown contain? (e.g. coordinator name, meal type, meal count, dietary restrictions, meal time)
- Is the crew meal data pulled from the staff assignments already in the system, or is it entered separately?
- Does the vendor (caterer) need to see this checklist, or is it only for coordinators?
- Is there a per-person meal allowance amount that should appear on the breakdown?

**Resolution:**
> *(fill in after client discussion)*

---

### A-08 — Suppliers Payment List Checklist Fields are Undefined
**Module:** Module 6 — Document Generation
**Severity:** Critical
**Status:** Open

**Problem:**
The Suppliers Payment List is one of the eight auto-generated checklists (FR-43). It likely pulls from vendor assignments and quotations — but it is unclear if this is fully auto-generated or requires manual additions.

**Questions for the client:**
- Is the Suppliers Payment List auto-generated from confirmed vendor assignments and their submitted quotations?
- Or does the coordinator manually add suppliers and amounts that are not in the vendor assignment system?
- What columns does it contain? (e.g. supplier name, service type, total agreed amount, amount paid, balance due, payment due date, payment method)
- Does this checklist need to be updated as payments are made to suppliers, or is it a point-in-time snapshot?

**Resolution:**
> *(fill in after client discussion)*

---

## Section B — Significant Gaps
> These create development ambiguity. The feature can be started but will require rework without resolution.

---

### B-01 — Booking Modification After Confirmation is Undefined
**Module:** Module 2 — Event Booking and Scheduling
**Severity:** Significant
**Status:** Open

**Problem:**
There is an FR for creating a booking (FR-09) and cancelling one (FR-15) but no FR for editing a confirmed booking. Changing the guest count has direct downstream effects on staff scheduling ratios.

**Questions for the client:**
- Can a confirmed booking be modified (venue, guest count, package, event date)?
- If yes, who can modify it — client only, coordinator only, or both?
- Does a guest count change automatically trigger a re-evaluation of coordinator staffing recommendations?
- Does modifying a booking require re-confirmation by the organizer?
- Are all modifications logged in the audit trail? (Assumed yes — but scope of what counts as a modification needs definition)

**Resolution:**
> *(fill in after client discussion)*

---

### B-02 — Flagged Payment Resolution Path is Undefined
**Module:** Module 3 — Payment Processing
**Severity:** Significant
**Status:** Open

**Problem:**
FR-23 allows staff to flag a payment submission — but there is no FR for what happens after a flag. The `FLAGGED` status in the data model currently has no exit path.

**Questions for the client:**
- When a payment is flagged, is the client notified? What does the notification say?
- Can the client resubmit a corrected payment proof after a flag, or must they contact the coordinator directly?
- Can a flagged payment be unflagged and verified by the same or different staff member?
- Does a flagged payment block the booking from progressing (e.g. prevents contract generation)?
- How many times can a client resubmit for the same payment?

**Resolution:**
> *(fill in after client discussion)*

---

### B-03 — Vendor Self-Profile Update is Undefined
**Module:** Module 4 — Vendor Directory and Coordination
**Severity:** Significant
**Status:** Open

**Problem:**
FR-29 and FR-35 only allow the administrator to manage vendor profiles. But vendors have login accounts — it is unclear if they can update their own information.

**Questions for the client:**
- Can vendors update their own contact information, business name, or coverage areas through their portal?
- Can vendors manage their own availability calendar (block/unblock dates), or is that only the administrator's responsibility?
- If vendors can update their profile, does the administrator receive a notification or need to approve the change?
- What vendor profile fields should vendors never be allowed to edit on their own?

**Resolution:**
> *(fill in after client discussion)*

---

### B-04 — Coordinator Availability Management is Undefined
**Module:** Module 5 — Staff Scheduling
**Severity:** Significant
**Status:** Open

**Problem:**
FR-40 detects double-booking conflicts at assignment time — but there is no FR for proactively marking a coordinator as unavailable on specific dates (leave, personal commitments, other engagements).

**Questions for the client:**
- Can coordinators mark themselves as unavailable on specific dates through the system?
- Or does the administrator manage coordinator availability on their behalf?
- Should unavailable dates block the system from assigning that coordinator, or just show a warning?
- Is coordinator availability tracked only by event assignment (reactive) or by a separate availability calendar (proactive)?

**Resolution:**
> *(fill in after client discussion)*

---

### B-05 — In-System Notification Model is Undefined
**Module:** All Modules
**Severity:** Significant
**Status:** Open

**Problem:**
NFR-24 requires that all automated notifications are delivered through both the system portal and registered email — but there is no FR, data model, or UI definition for what the in-system notification looks like. There is currently no `Notification` entity in the schema.

**Questions for the client:**
- Should the system have a notification bell/inbox where users can see all their unread notifications?
- Are notifications dismissible, or do they persist until the related action is resolved?
- Which events trigger an in-system notification? (e.g. booking confirmed, payment submitted, vendor responded, installment due, document generated)
- Should there be a notification history — a log of all past notifications per user?
- Should unread notification counts appear as badges on navigation items?

**Resolution:**
> *(fill in after client discussion)*

---

### B-06 — Document Regeneration is Undefined
**Module:** Module 6 — Document Generation
**Severity:** Significant
**Status:** Open

**Problem:**
FR-41 through FR-43 describe documents as auto-generated on trigger events — but there is no FR for what happens if booking details change after generation, or if a coordinator needs to regenerate a corrupted or outdated document.

**Questions for the client:**
- Can a coordinator manually trigger document regeneration for a specific booking?
- If a document is regenerated, does the old version get replaced or archived?
- Should there be a version history for generated documents?
- Who can trigger regeneration — coordinator, admin, or both?
- If a booking's package or guest count changes, should all related documents be flagged as outdated?

**Resolution:**
> *(fill in after client discussion)*

---

### B-07 — Audit Log DB-Level Immutability Mechanism is Unspecified
**Module:** Module 7 — Audit Trail
**Severity:** Significant
**Status:** Open

**Problem:**
FR-50 restricts audit log access to admin only — but that is a UI-level control. The thesis's tamper-evident claim requires that audit logs are also protected at the database level, which is not specified in any FR or NFR.

**Questions for the development team (internal — no client input needed):**
- Should audit log immutability be enforced via a separate PostgreSQL role with no UPDATE/DELETE privileges on the `AuditLog` table?
- Should audit log writes use a dedicated database user with INSERT-only access?
- Should we implement a hash chain (each log entry hashes the previous) to make tampering detectable?
- Should the audit log be in a separate schema from the rest of the application data?

**Resolution:**
> *(fill in before Module 7 development begins)*

---

### B-08 — Personal Checklist and Reminders Content is Undefined
**Module:** Module 6 — Document Generation
**Severity:** Significant
**Status:** Open

**Problem:**
The Personal Checklist and Reminders is the eighth auto-generated checklist type (FR-43) but its content and data source are completely undefined.

**Questions for the client:**
- What does the Personal Checklist and Reminders contain? Is it a generic pre-event to-do list, or is it customized per event type (wedding vs. debut)?
- Is this checklist auto-populated from booking data or is it a static template with fixed reminders?
- Examples of what it might include: attire reminders, venue arrival times, coordinator contact numbers, day-of timeline. Which of these apply?
- Can the client add their own items to this checklist, or is it read-only?

**Resolution:**
> *(fill in after client discussion)*

---

## Section C — Minor Gaps
> Lower risk but should be defined before the affected module is built.

---

### C-01 — Password Complexity Rules are Undefined
**Module:** Module 1 — Authentication
**Severity:** Minor
**Status:** Open

**Questions for the client / development team:**
- What are the minimum password requirements? (e.g. minimum 8 characters, at least one uppercase, one number, one special character)
- Should the system enforce password expiry (e.g. must change every 90 days)?
- Should the system prevent reuse of the last N passwords?

**Resolution:**
> *(fill in before Module 1 development begins)*

---

### C-02 — Account Lockout Threshold and Unlock Process
**Module:** Module 1 — Authentication
**Severity:** Minor
**Status:** Open

**Questions for the client:**
- How many consecutive failed login attempts trigger account lockout? (Common defaults: 3, 5, or 10)
- Is the lockout temporary (auto-unlocks after X minutes) or permanent until admin intervention?
- Can a locked user self-unlock via a password reset email, or must the admin unlock them?
- Should the admin receive a notification when an account is locked?

**Resolution:**
> *(fill in before Module 1 development begins)*

---

### C-03 — Session Timeout Duration
**Module:** Module 1 — Authentication
**Severity:** Minor
**Status:** Open

**Questions for the client:**
- What is the acceptable inactivity timeout before a session expires and requires re-login?
- Should this be the same for all roles, or different per role? (e.g. admin has shorter timeout than client)
- Should the system warn the user before the session expires with a countdown?

**Resolution:**
> *(fill in before Module 1 development begins)*

---

### C-04 — Report and Audit Export Formats
**Module:** Modules 7–8 — Audit Trail and Reports
**Severity:** Minor
**Status:** Open

**Problem:**
FR-51 and FR-57 say exports are available in "standard digital formats" — but the format is never defined anywhere in the thesis.

**Questions for the client:**
- Should reports and audit exports be available as PDF, CSV, or both?
- Are there specific tools the business owner uses to open exported files? (e.g. Excel, Google Sheets)
- Should PDF exports be formatted as print-ready documents with the Fab Memories Events branding?
- Should CSV exports include column headers?

**Resolution:**
> *(fill in before Modules 7–8 development begins)*

---

### C-05 — Email Notification Content and Sender Identity
**Module:** All Modules
**Severity:** Minor
**Status:** Open

**Problem:**
Multiple FRs reference automated email notifications (FR-27 due date reminders, FR-32 vendor assignment emails) but no FR defines the content, tone, sender name, or sender email address.

**Questions for the client:**
- What sender name and email address should system emails come from? (e.g. "Fab Memories Events" \<events@fabmemories.com\>)
- Should emails use the business's branding (logo, colors, signature)?
- For payment due date reminders — how many days before the due date should the reminder be sent? (e.g. 7 days, 3 days, 1 day)
- Should clients receive a confirmation email immediately after submitting their booking request, or only after the organizer confirms?
- Should coordinators receive a daily digest of pending tasks, or only event-triggered notifications?

**Resolution:**
> *(fill in before any email-triggering module is built)*

---

### C-06 — Booking Decline Reason and Client Notification
**Module:** Module 2 — Event Booking and Scheduling
**Severity:** Minor
**Status:** Open

**Problem:**
FR-12 allows the organizer to decline a booking request — but there is no FR defining whether a reason is required or how the client is informed.

**Questions for the client:**
- Is the organizer required to enter a reason when declining a booking request?
- Is the decline reason visible to the client in their portal?
- Does the client receive an email notification when their booking request is declined?
- Can a declined booking be re-submitted by the client for a different date, or does it need to be a completely new request?

**Resolution:**
> *(fill in before Module 2 development begins)*

---

### C-07 — Coordinator Notification Scope
**Module:** Module 3 — Payment Processing / Module 5 — Staff Scheduling
**Severity:** Minor
**Status:** Open

**Problem:**
It is unclear which payment-related notifications coordinators receive vs. only the administrator.

**Questions for the client:**
- When a client submits payment proof, does the notification go to all coordinators or only the coordinator assigned to that specific booking?
- When an installment is overdue, who is notified — admin only, assigned coordinator only, or both?
- Can coordinators see payment submissions for all bookings, or only their assigned ones?

**Resolution:**
> *(fill in before Module 3 development begins)*

---

## Section D — UI / UX and Visual Design Questions
> These do not block development but must be resolved before the frontend is built. Leaving these open means the interface will need to be rebuilt after client feedback.

---

### D-01 — Branding and Visual Identity
**Status:** Open

**Problem:**
The thesis contains no branding specifications. The system will be built for Fab Memories Events — a wedding and debut coordination business — but no colors, logo, or design direction has been documented.

**Questions for the client:**
- Does Fab Memories Events have an existing logo? If yes, please provide it in SVG or PNG format at high resolution.
- Does the business have established brand colors? (e.g. primary color, accent color, neutral tones)
- What is the general visual feel the business owner prefers?
  - [ ] Elegant and minimal (soft whites, gold, muted tones — consistent with wedding industry)
  - [ ] Modern and professional (dark sidebars, strong typography, data-forward)
  - [ ] Warm and personal (warm neutrals, handwritten-style accents, approachable)
  - [ ] Other — please describe
- Are there any existing materials (social media pages, printed collateral, business cards) we can reference for visual direction?

**Resolution:**
> *(fill in before any frontend module is built)*

---

### D-02 — Dark Mode vs. Light Mode
**Status:** Open

**Questions for the client:**
- Should the system support dark mode, light mode, or both with a user toggle?
- If both — which should be the default?
- Are there any accessibility requirements (e.g. high contrast mode for users with visual impairments)?

**Resolution:**
> *(fill in before frontend setup)*

---

### D-03 — Dashboard Layout Preference
**Status:** Open

**Problem:**
The admin dashboard is the most frequently used screen. Its layout significantly affects how quickly the business owner can find actionable information.

**Questions for the client:**
- Which metric is most important to see immediately upon login?
  - [ ] Pending payment verifications (action required)
  - [ ] Upcoming events in the next 7–14 days
  - [ ] Recent audit activity
  - [ ] Unconfirmed booking requests
- Should the dashboard have a sidebar navigation or a top navigation bar?
- Should the calendar be visible on the dashboard, or only on its own dedicated page?
- Should the admin dashboard and the coordinator dashboard look different, or share the same layout with role-filtered content?

**Resolution:**
> *(fill in before Module 8 / dashboard development begins)*

---

### D-04 — Client Portal vs. Main System — Same or Separate UI?
**Status:** Open

**Problem:**
Clients, vendors, coordinators, and the admin all log into the same system but have very different scopes of access. It is an open design question whether the client and vendor portals should feel visually distinct from the admin/coordinator interface.

**Questions for the client:**
- Should the client portal have a simpler, more consumer-friendly design compared to the admin and coordinator interface?
- Should clients see the full system navigation (with their features only) or a stripped-down portal with only their booking, payment, and documents?
- Same question for vendors — should they have a full navigation sidebar or a simplified task-focused view?
- Should the login page be the same for all user types, or should there be separate login entry points per role?

**Resolution:**
> *(fill in before any client-facing or vendor-facing module is built)*

---

### D-05 — Mobile Responsiveness Priority
**Status:** Open

**Problem:**
NFR-22 requires the system to work on smartphones — but it is unspecified which modules are most likely to be accessed on mobile and whether any mobile-specific layouts are needed.

**Questions for the client:**
- Which user roles are most likely to access the system on a mobile device? (Clients uploading payment proof? Vendors confirming assignments? Coordinators checking schedules on event day?)
- Are there any specific workflows that must be fully optimized for mobile? (e.g. payment proof upload, booking status check)
- Is tablet-optimized layout important, or is desktop + mobile sufficient?

**Resolution:**
> *(fill in before frontend development begins)*

---

### D-06 — Table and Data Display Preferences
**Status:** Open

**Questions for the client:**
- For tables with many records (booking list, payment list, audit log) — should the system use pagination, infinite scroll, or load-more?
- How many rows per page is preferred for paginated tables? (Common: 10, 20, 50)
- Should tables support column sorting and filtering, or is a global search bar sufficient?
- For the audit trail specifically — should the most recent entry appear at the top (newest first) or chronologically from oldest?

**Resolution:**
> *(fill in before any list/table component is built)*

---

### D-07 — Language and Locale
**Status:** Open

**Questions for the client:**
- Should the system interface be in English only, or should Filipino language support be added?
- What date format should be used throughout? (e.g. `January 15, 2026` vs. `01/15/2026` vs. `15 Jan 2026`)
- What currency format should be used? (e.g. `₱ 50,000.00` or `PHP 50,000.00`)
- What time format is preferred — 12-hour (3:00 PM) or 24-hour (15:00)?
- What timezone should the system operate in? (Assumed: Asia/Manila — confirm)

**Resolution:**
> *(fill in before any date, time, or currency display is implemented)*

---

### D-08 — Notification Display Style
**Status:** Open

**Questions for the client:**
- Should in-system notifications appear as a dropdown from a bell icon in the header?
- Should urgent notifications (e.g. overdue payment, new booking request) appear as toast pop-ups that auto-dismiss, or as persistent banners that require manual dismissal?
- Should there be sound or browser notification support for high-priority alerts?
- How long should toast notifications remain on screen before auto-dismissing? (Common: 3–5 seconds)

**Resolution:**
> *(fill in before notification system is built)*

---

### D-09 — Document and PDF Visual Design
**Status:** Open

**Questions for the client:**
- Should generated PDFs (contracts, invoices, receipts, checklists) use the Fab Memories Events branding (logo, colors, header)?
- Is there an existing contract or invoice template (Word or PDF) we can use as a visual reference?
- Should all eight checklist types follow the same PDF layout/style, or do different checklists have different formats?
- Should the generated PDF include a footer with the business's contact information on every page?
- What paper size should PDFs be generated for — A4 or Letter (8.5 × 11)?

**Resolution:**
> *(fill in before Module 6 / document generation is built)*

---

### D-10 — Status Color Coding Convention
**Status:** Open

**Problem:**
The system uses multiple status values across bookings, payments, vendor assignments, and installments. Consistent color coding across all modules is important for usability but needs client sign-off.

**Proposed defaults — confirm or adjust:**

| Status | Proposed Color |
|---|---|
| PENDING | Gray / Neutral |
| CONFIRMED / VERIFIED | Green |
| CANCELLED / DECLINED | Red |
| SUBMITTED / IN PROGRESS | Blue |
| FLAGGED / OVERDUE | Amber / Orange |
| BACKUP / SECONDARY | Purple |

**Questions for the client:**
- Do any of these color associations conflict with the business's branding?
- Are there any status colors that need to feel more urgent or more neutral?

**Resolution:**
> *(fill in before any status badge component is built)*

---

## Summary Checklist

### Critical (must resolve before building affected module)
- [ ] A-01 — Guest data input definition
- [ ] A-02 — Booking cancellation policy
- [ ] A-03 — Installment schedule creation and overdue handling
- [ ] A-04 — Package customization structure
- [ ] A-05 — Client self-registration flow
- [ ] A-06 — Entourage list fields
- [ ] A-07 — Crew meal breakdown fields
- [ ] A-08 — Suppliers payment list fields

### Significant (should resolve before affected module is built)
- [ ] B-01 — Booking modification rules
- [ ] B-02 — Flagged payment resolution path
- [ ] B-03 — Vendor self-profile update scope
- [ ] B-04 — Coordinator availability management
- [ ] B-05 — In-system notification model
- [ ] B-06 — Document regeneration policy
- [ ] B-07 — Audit log DB-level immutability (internal)
- [ ] B-08 — Personal checklist and reminders content

### Minor (resolve before affected module is built)
- [ ] C-01 — Password complexity rules
- [ ] C-02 — Account lockout threshold and unlock process
- [ ] C-03 — Session timeout duration
- [ ] C-04 — Report and audit export formats
- [ ] C-05 — Email notification content and sender identity
- [ ] C-06 — Booking decline reason and client notification
- [ ] C-07 — Coordinator notification scope

### UI / UX and Visual Design (resolve before frontend development)
- [ ] D-01 — Branding and visual identity
- [ ] D-02 — Dark mode vs. light mode
- [ ] D-03 — Dashboard layout preference
- [ ] D-04 — Client portal vs. main system UI distinction
- [ ] D-05 — Mobile responsiveness priority
- [ ] D-06 — Table and data display preferences
- [ ] D-07 — Language and locale settings
- [ ] D-08 — Notification display style
- [ ] D-09 — Document and PDF visual design
- [ ] D-10 — Status color coding convention
