# Product Requirements Document (PRD)
# Real-Time Transaction Monitoring in Event Management Systems

**Version:** 1.0
**Last Updated:** May 2026
**Author:** Vingno, John Carlo T. | Borces, Miguel C. | Santos, James Harlan T.
**Status:** Approved

---

## 1. Overview

### 1.1 Product Summary
This product is a web-based event planning and real-time transaction monitoring system built specifically for Fab Memories Events — a wedding and debut event planning and coordination business operating across Metro Manila, Tagaytay, Cavite, Laguna, and Batangas. It replaces all current manual and fragmented operations with a centralized digital platform that integrates event booking, payment processing, vendor coordination, staff scheduling, document generation, and a comprehensive audit trail with real-time decision support reporting.

### 1.2 Problem Statement
Fab Memories Events currently manages all core operations through manual and fragmented methods — client inquiries arrive through Facebook Messenger, Instagram, email, and Viber; bookings are confirmed via manually verified deposit screenshots; vendor availability is checked through individual phone calls; and staff scheduling is done entirely by the owner. Most critically, no audit trail or activity log of any kind exists. The business owner has no mechanism to track who accessed what information, when transactions were submitted or modified, or what operational decisions were made. This absence of monitoring and accountability creates untracked payment discrepancies, unmonitored booking modifications, and the complete inability to generate data-driven operational reports for management decision-making.

### 1.3 Goals
- Provide the business owner with real-time visibility into all operational activities through a comprehensive audit trail and monitoring dashboard that enables proactive risk identification and evidence-based decision-making.
- Replace all manual and fragmented workflows — booking, payment verification, vendor coordination, staff scheduling, and document generation — with structured, centralized digital processes.
- Implement role-based access control so coordinators, vendors, and clients each have appropriate, secure access to the system relevant to their operational responsibilities.

### 1.4 Non-Goals
> Things explicitly out of scope for this version.

- Mobile application development (web-based only).
- Third-party payment gateway API integration (GCash, Maya, etc.) — payment proof is uploaded manually by clients.
- Digital guest check-in system with Smart TV display and table assignment — deferred to a future version.
- Multi-tenant / multi-business support — this system is built exclusively for Fab Memories Events.
- Artificial intelligence or recommendation engine features.

---

## 2. Users

### 2.1 User Roles

| Role | Description | Access Level |
|---|---|---|
| Administrator (Business Owner) | Full system access. Manages all users, bookings, payments, vendors, staff, documents, audit trail, and reports. | Admin — full access to all modules |
| Event Coordinator / Staff | Manages assigned events, coordinates vendors, handles booking confirmations and scheduling tasks. | Authenticated — role-scoped to event operations |
| Vendor | Views assigned event details and service requirements. Confirms or declines assignments and submits service quotations. | Authenticated — own assignments only |
| Client | Submits booking requests, uploads payment proof, tracks booking and payment status, downloads generated documents. | Authenticated — own booking records only |

### 2.2 User Stories

#### Administrator (Business Owner)
- As an administrator, I want to view a real-time dashboard of all active bookings, pending payments, and recent audit activity so that I can monitor operations proactively without manually checking each record.
- As an administrator, I want the system to log every user action with a timestamp and user identity so that I have a complete and tamper-evident accountability record of all business activities.
- As an administrator, I want to generate and export real-time operational and transaction reports so that I can make data-driven management decisions.
- As an administrator, I want to manage the full service package catalog including pricing per location and tier so that clients always see accurate and up-to-date offerings.
- As an administrator, I want to assign coordinators to events based on guest count recommendations so that staffing is accurate and compliant with the business's established ratios.

#### Event Coordinator / Staff
- As a coordinator, I want to view all event records and schedules assigned to me so that I can prepare for upcoming events without depending on the owner.
- As a coordinator, I want to verify client payment proof submissions through a structured interface so that all payment verifications are recorded and accountable.
- As a coordinator, I want to assign and notify vendors for specific events through the system so that coordination no longer depends on phone calls.
- As a coordinator, I want to see conflict alerts when a coordinator is assigned to overlapping events so that scheduling errors are caught before they cause problems.

#### Vendor
- As a vendor, I want to receive assignment notifications with event details through the system so that I no longer have to wait for individual phone calls.
- As a vendor, I want to confirm or decline event assignments and submit service quotations through the system so that all agreements are formally recorded.
- As a vendor, I want to view only my own assigned events and service requirements so that I have the information I need without accessing unrelated business data.

#### Client
- As a client, I want to submit a booking request with my event details online so that I don't have to coordinate through multiple chat channels.
- As a client, I want to upload my payment proof directly through the system so that verification is structured and I receive confirmation without informal messaging.
- As a client, I want to track the real-time status of my booking and payment verification so that I am always informed without having to follow up manually.
- As a client, I want to download my contract, invoices, receipts, and event checklists from the system so that all my event documents are organized in one place.

---

## 3. Features

### 3.1 Feature List

| # | Feature | Priority | Module |
|---|---|---|---|
| 1 | User Authentication and Access Control | Must Have | Module 1 |
| 2 | Event Booking and Scheduling | Must Have | Module 2 |
| 3 | Service Package Management | Must Have | Module 2 |
| 4 | Payment Processing and Transaction Management | Must Have | Module 3 |
| 5 | Vendor Directory and Coordination | Must Have | Module 4 |
| 6 | Staff Scheduling | Must Have | Module 5 |
| 7 | Document Generation and Management | Must Have | Module 6 |
| 8 | Secured Event Planning and Audit Trail | Must Have | Module 7 |
| 9 | Real-Time Reporting and Decision Support | Must Have | Module 7 |

---

### 3.2 Feature Details

#### Feature 1 — User Authentication and Access Control
**Priority:** Must Have
**Description:** Controls all system entry points and enforces role-based access for all four user types. Implements multi-factor authentication (OTP via email), account lockout after failed attempts, session timeout, and password management. Role-based access is enforced at both the interface and API levels on every request.

**Acceptance Criteria:**
- [ ] All users must authenticate with valid credentials before accessing any feature.
- [ ] MFA sends a one-time password to the user's registered email on every login.
- [ ] Accounts are temporarily locked after a defined number of consecutive failed login attempts.
- [ ] Sessions expire after a defined period of inactivity and require re-authentication.
- [ ] Each user role (Administrator, Coordinator, Vendor, Client) sees only the features and data relevant to their role.
- [ ] Passwords are stored in a protected (hashed) format and users can change their own passwords.

---

#### Feature 2 — Event Booking and Scheduling
**Priority:** Must Have
**Description:** Manages the complete booking lifecycle from client request submission to confirmation. Enforces the business's one-event-per-day constraint at the database level. Provides real-time availability checking for clients and a booking management interface for the organizer. Includes an event calendar view across all booking statuses.

**Acceptance Criteria:**
- [ ] Clients can submit booking requests with event type, preferred date, venue, and estimated guest count.
- [ ] The system automatically rejects booking requests for dates that are already confirmed.
- [ ] Real-time schedule availability is displayed to clients during request submission.
- [ ] The event organizer is notified of new requests and can confirm or decline each booking.
- [ ] Clients can view the real-time status of their booking request at all times through the client portal.
- [ ] A calendar view shows all confirmed, pending, and cancelled events organized by date.
- [ ] The administrator and authorized coordinators can search and manage all booking records.

---

#### Feature 3 — Service Package Management
**Priority:** Must Have
**Description:** Manages the complete service package catalog for Fab Memories Events including Full Planning, Partial Planning, and On-the-Day Coordination tiers for both Wedding and Debut event types, with location-based pricing for Metro Manila and provincial venues. Supports package customization with all selections recorded as part of the booking.

**Acceptance Criteria:**
- [ ] The administrator can create, update, and manage all service packages and pricing tiers.
- [ ] Location-based pricing (Metro Manila vs. provincial) is supported for all packages.
- [ ] Clients can customize their selected package and all customizations are saved to the booking record.
- [ ] The selected package is permanently linked to the booking record.

---

#### Feature 4 — Payment Processing and Transaction Management
**Priority:** Must Have
**Description:** Implements a structured payment proof submission and staff verification workflow for all accepted payment methods: GCash, Maya, Bank Transfer, Cheque (deposits only), and Cash. No third-party gateway API is used. Clients submit a screenshot or reference number; staff verify through the system. All verification actions are recorded in the audit trail. Includes installment payment tracking, invoice generation, and receipt generation.

**Acceptance Criteria:**
- [ ] Clients can submit payment proof by uploading a screenshot or entering an official reference number.
- [ ] The payment method is recorded for every transaction.
- [ ] Staff receive a notification when a client submits payment proof and can confirm or flag it through the system.
- [ ] Upon staff confirmation, the booking payment status updates to Verified and the verifying staff identity and timestamp are recorded in the audit trail.
- [ ] An invoice is automatically generated for each confirmed booking.
- [ ] An official receipt is automatically generated and delivered to the client upon payment verification.
- [ ] Installment schedules are tracked per contract terms with running balance and upcoming due date notifications.
- [ ] Every payment record captures amount, method, proof type, submission timestamp, verification timestamp, and verifying staff identity.

---

#### Feature 5 — Vendor Directory and Coordination
**Priority:** Must Have
**Description:** Provides a private digital vendor directory with service type, contact information, coverage areas, and availability calendar. Replaces phone call-based coordination with structured digital assignment notifications, vendor confirmation workflows, and service quotation recording.

**Acceptance Criteria:**
- [ ] The administrator can manage a private vendor directory with full profile details and availability.
- [ ] Coordinators can check vendor availability for specific event dates through the system.
- [ ] Vendors can be assigned to confirmed events with all assignments recorded.
- [ ] Vendors receive automated assignment notifications with event details and service requirements.
- [ ] Vendors can confirm or decline assignments and submit service quotations through the system.
- [ ] Coordinators are notified of vendor responses.

---

#### Feature 6 — Staff Scheduling
**Priority:** Must Have
**Description:** Automates coordinator assignment using the business's established guest count-based staffing ratios: 4–5 coordinators for up to 50 guests, 7–8 for 51–150 guests, 8–12 for 151 or more guests. Includes backup coordinator designation and conflict detection to prevent double-assignment.

**Acceptance Criteria:**
- [ ] A coordinator roster is maintained with availability status, assigned events, and contact information.
- [ ] The system presents staffing ratio recommendations based on confirmed guest count.
- [ ] All coordinator assignments and designated tasks are recorded per event.
- [ ] Backup coordinators can be designated per event.
- [ ] The system detects and alerts the administrator when a coordinator is assigned to overlapping events.

---

#### Feature 7 — Document Generation and Management
**Priority:** Must Have
**Description:** Automates generation of all key business documents triggered by workflow events — booking confirmation triggers the contract and welcome letter; payment verification triggers invoices and receipts. Generates all eight event checklist types. Documents are stored and accessible through role-appropriate interfaces.

**Acceptance Criteria:**
- [ ] A client contract is automatically generated and populated with confirmed booking details upon booking confirmation.
- [ ] A welcome letter is automatically generated and delivered to the client upon booking confirmation.
- [ ] All eight event checklist types are automatically generated: Event Details, Guest List (Alphabetical), Guest List per Table Groupings, Suppliers Directory, Entourage List, Crew Meal Breakdown, Suppliers Payment List, and Personal Checklist and Reminders.
- [ ] Invoices and receipts are delivered to the client through the portal and via email.
- [ ] All generated documents are stored and accessible through role-appropriate interfaces.
- [ ] The administrator can manage document templates for all generated document types.

---

#### Feature 8 — Secured Event Planning and Audit Trail
**Priority:** Must Have
**Description:** The core accountability feature of the system. Logs every user action across all modules with user identity, action performed, system module, description, timestamp, and action status. Audit log entries are immutable — no user can modify or delete them. The administrator can search, filter, and export the full audit trail.

**Acceptance Criteria:**
- [ ] Every user action is logged: login/logout events, booking confirmations, payment submissions and verifications, document generation events, vendor assignments, staff scheduling actions, and report accesses.
- [ ] Each audit log entry records user identity, action, module, description, timestamp, and action status.
- [ ] Audit trail access is restricted to the administrator only.
- [ ] The audit trail is searchable and filterable by date range, user, module, and action type.
- [ ] Audit log entries cannot be modified or deleted by any user.
- [ ] The administrator can export audit trail records.

---

#### Feature 9 — Real-Time Reporting and Decision Support
**Priority:** Must Have
**Description:** Provides the business owner with a real-time operational dashboard and five types of exportable reports — booking, payment/transaction, vendor coordination, staff scheduling, and audit trail. All reports are generated from live system data and are designed to support proactive risk identification and evidence-based management decisions, as framed by DSS Theory.

**Acceptance Criteria:**
- [ ] A real-time dashboard shows key business metrics: active bookings, pending payment verifications, upcoming events, and recent audit activity.
- [ ] Booking and scheduling reports show all confirmed, pending, and cancelled bookings with event details.
- [ ] Payment and transaction reports show all submitted proofs, verification actions, confirmed payments, outstanding balances, and installment summaries.
- [ ] Vendor coordination reports show all assignments, confirmation statuses, and quotations.
- [ ] Staff scheduling reports show coordinator assignments, staffing levels, and backup designations per event.
- [ ] Audit trail reports show all logged user actions filterable by date, user, or module.
- [ ] All reports can be exported in standard digital formats by the administrator and authorized coordinators.

---

## 4. User Flows

### 4.1 Client Booking and Payment Flow
1. Client registers and logs in to the system with MFA verification.
2. Client browses available service packages and selects event type, date, venue, and guest count.
3. System checks availability in real time and confirms the date is open.
4. Client submits booking request; the event organizer is notified.
5. Organizer reviews the request, confirms the booking, and the system automatically generates a contract and welcome letter delivered to the client.
6. Client receives invoice; uploads payment proof (screenshot or reference number) via the client portal.
7. Staff is notified and verifies the payment through the verification interface.
8. System updates payment status to Verified, generates and delivers a receipt to the client, and logs the verification action in the audit trail.
9. Client can track all booking and payment statuses in real time through the client portal.

### 4.2 Vendor Assignment Flow
1. Coordinator logs in and navigates to an event record.
2. Coordinator checks vendor availability for the event date through the digital vendor directory.
3. Coordinator assigns a vendor to the event; the system sends an automated assignment notification to the vendor.
4. Vendor logs in, reviews the event details and service requirements, and confirms or declines the assignment.
5. Coordinator is notified of the vendor's response; vendor submits a service quotation if accepted.
6. All assignment and quotation records are stored against the event and logged in the audit trail.

### 4.3 Administrator Monitoring and Reporting Flow
1. Administrator logs in and views the real-time operational dashboard — active bookings, pending verifications, upcoming events, and recent audit activity.
2. Administrator accesses the audit trail to review specific user actions, filtering by user, module, date, or action type.
3. Administrator generates a transaction report to review all payment submissions, verifications, and outstanding balances.
4. Administrator exports the report for record-keeping or business review.

---

## 5. Pages & Screens

| Page | Route | Who Can Access | Purpose |
|---|---|---|---|
| Login | `/login` | All users | Authenticate with credentials + MFA OTP |
| Dashboard | `/dashboard` | Administrator | Real-time metrics, pending verifications, upcoming events, recent audit activity |
| Bookings List | `/bookings` | Administrator, Coordinator | View and manage all booking records |
| New Booking | `/bookings/new` | Client | Submit a new event booking request |
| Booking Detail | `/bookings/[bookingId]` | Administrator, Coordinator, Client (own) | View booking details, payment status, documents, assigned vendors and coordinators |
| Event Calendar | `/calendar` | Administrator, Coordinator | Calendar view of all events by date and status |
| Packages | `/packages` | Administrator | Manage service package catalog and pricing |
| Payments | `/payments` | Administrator, Coordinator | View all payment submissions and verification queue |
| Payment Detail | `/payments/[paymentId]` | Administrator, Coordinator | Review proof and confirm or flag payment |
| Vendor Directory | `/vendors` | Administrator, Coordinator | Browse and manage the private vendor directory |
| Vendor Profile | `/vendors/[vendorId]` | Administrator, Coordinator | View vendor details, availability, and assignment history |
| Vendor Portal | `/vendor-portal` | Vendor | View own assignments, confirm/decline, submit quotations |
| Staff Scheduling | `/staff` | Administrator, Coordinator | View coordinator roster and manage event assignments |
| Documents | `/documents` | Administrator, Coordinator, Client (own) | Access generated contracts, invoices, receipts, and checklists |
| Audit Trail | `/audit` | Administrator | Search, filter, and export all system activity logs |
| Reports | `/reports` | Administrator, Coordinator | Generate and export all operational and transaction reports |
| Client Portal | `/portal` | Client | Track booking status, view payment history, download documents |
| Account Settings | `/settings` | All users | Change password, manage profile |

---

## 6. Data

### 6.1 Core Entities

| Entity | Key Fields | Relates To |
|---|---|---|
| User | id, name, email, passwordHash, role, isLocked, createdAt | Booking, AuditLog, PaymentVerification, StaffAssignment |
| Booking | id, clientId, eventType, eventDate, venue, guestCount, status, packageId, createdAt | Client (User), Package, Payment, VendorAssignment, StaffAssignment, Document |
| Package | id, name, tier, eventType, locationPricing, inclusions, isActive | Booking |
| Payment | id, bookingId, amount, method, proofType, proofUrl, referenceNumber, status, submittedAt, verifiedAt, verifiedById | Booking, User (verifier) |
| Installment | id, paymentId, dueDate, amount, status, paidAt | Payment |
| Vendor | id, name, serviceType, contactInfo, coverageAreas, isActive | VendorAssignment |
| VendorAssignment | id, bookingId, vendorId, status, quotationAmount, assignedAt, confirmedAt | Booking, Vendor |
| Coordinator | id, userId, isActive | StaffAssignment |
| StaffAssignment | id, bookingId, coordinatorId, role, isBackup, assignedAt | Booking, Coordinator |
| Document | id, bookingId, type, filePath, generatedAt | Booking |
| AuditLog | id, userId, action, module, description, status, timestamp | User |

### 6.2 Business Rules
- Only one event can be confirmed per calendar date (one-event-per-day constraint enforced at the database level with a unique index on confirmed `eventDate`).
- A booking cannot be confirmed until a reservation deposit payment has been submitted and verified.
- Payment records are immutable after staff verification — no modifications are allowed post-confirmation.
- Audit log entries cannot be modified or deleted by any user under any circumstance.
- Cheque is accepted as a payment method for deposits only.
- Staff scheduling must follow the established guest count-based ratios: 4–5 coordinators for ≤50 guests, 7–8 for 51–150, 8–12 for 151+.
- Coordinators cannot be assigned to two confirmed events on the same date (conflict detection at both UI and API level).
- All eight checklist types are generated automatically upon booking confirmation.
- Vendor directory is private — only administrators and coordinators can view vendor profiles.
- Clients can only access their own booking and payment records.

---

## 7. Non-Functional Requirements

| Concern | Requirement |
|---|---|
| Authentication | Email/password with MFA (OTP via email) on every login |
| Authorization | Role-based access control enforced at both interface and API levels on every request |
| Performance | All pages load within 5 seconds; booking availability check within 3 seconds; payment notifications within 1 minute of submission; document generation within 30 seconds; report generation within 10 seconds |
| Availability | Minimum 99% uptime during business operating hours |
| Data Integrity | All inputs validated client-side and server-side; one-event-per-day enforced at DB level; payment records immutable after verification |
| Audit Trail Integrity | All audit log entries are tamper-evident and non-deletable |
| Accessibility | Fully functional on all major modern web browsers (desktop, laptop, tablet, smartphone) |
| Reliability | Multi-step operations complete atomically; errors handled gracefully without data corruption; regular automated database backups supported |
| Data Privacy | Sensitive client and financial data protected through structured access controls; payment proof stored in access-controlled location |

---

## 8. Out of Scope (This Version)

- Mobile application (iOS or Android).
- Payment gateway API integration (GCash Merchant, Maya Business, etc.).
- Digital guest check-in system with Smart TV display and table assignment.
- Multi-tenant / multi-organization support.
- AI-powered features, recommendations, or automation beyond rule-based workflows.
- Public-facing marketing website or service catalog.

---

## 9. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | What is the exact session timeout duration acceptable to the business owner? | Business Owner | Open |
| 2 | How many consecutive failed login attempts should trigger account lockout? | Researchers | Open |
| 3 | Should coordinators have access to audit trail reports or only the administrator? | Business Owner | Open |
| 4 | What export formats are required for reports — PDF, CSV, or both? | Business Owner | Open |
| 5 | What is the installment schedule structure — fixed terms or configurable per contract? | Business Owner | Open |
