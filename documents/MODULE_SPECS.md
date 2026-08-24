# Module Specifications
# Real-Time Transaction Monitoring in Event Management Systems — Fab Memories Events

---

## Status Legend
- ✅ Done
- 🚧 In Progress
- ⬜ Not Started

---

# Module 1 — Authentication and Access Control

## Scaffold
- ⬜ `npm run create-feature -- --name auth`
- ⬜ `npm run create-feature -- --name users`

---

## Auth Feature
- ⬜ `features/auth/schemas/auth.schema.ts` — `loginSchema`, `verifyOtpSchema`, `changePasswordSchema`
- ⬜ `features/auth/types/auth.types.ts` — `AuthSession`, `JwtPayload`, `LoginResponse`
- ⬜ `features/auth/services/auth.service.ts` — `login()`, `verifyOtp()`, `logout()`, `changePassword()`, `refreshToken()`
- ⬜ `features/auth/hooks/use-auth.ts` — `useLogin()`, `useVerifyOtp()`, `useLogout()`, `useChangePassword()`
- ⬜ `features/auth/index.ts` — barrel file

## Users Feature
- ⬜ `features/users/schemas/users.schema.ts` — `createUserSchema`, `updateUserSchema`
- ⬜ `features/users/types/users.types.ts` — `UserWithProfile`
- ⬜ `features/users/services/users.service.ts` — `getUsers()`, `getUser(id)`, `createUser()`, `updateUser()`
- ⬜ `features/users/hooks/use-users.ts` — `useUsers()`, `useUser(id)`, `useCreateUser()`, `useUpdateUser()`
- ⬜ `features/users/index.ts` — barrel file

---

## API Routes

### Auth
- ⬜ `POST   /api/auth/login` — validate credentials, generate OTP, send email
- ⬜ `POST   /api/auth/verify-otp` — verify OTP hash, issue JWT cookies
- ⬜ `POST   /api/auth/logout` — clear httpOnly JWT cookies
- ⬜ `POST   /api/auth/refresh` — rotate refresh token, issue new access token
- ⬜ `PATCH  /api/auth/change-password` — update passwordHash for current user

### Users
- ⬜ `POST   /api/users` — create user with role (Admin only)
- ⬜ `GET    /api/users` — list all users (Admin only)
- ⬜ `GET    /api/users/[userId]` — get user profile (Admin only)
- ⬜ `PATCH  /api/users/[userId]` — update user info or unlock account (Admin only)

---

## Pages
- ⬜ `app/(public)/login/page.tsx` — email/password form → OTP verification step → redirect to dashboard
- ⬜ `app/(authenticated)/settings/page.tsx` — change password form for all user roles
- ⬜ `app/(authenticated)/users/page.tsx` — list all registered users (Admin only)
- ⬜ `app/(authenticated)/users/new/page.tsx` — create user account with role assignment (Admin only)
- ⬜ `app/(authenticated)/users/[userId]/page.tsx` — user profile detail with unlock action (Admin only)

---

## Components
- ⬜ `features/auth/components/login-form.tsx` — email/password form with error display
- ⬜ `features/auth/components/otp-form.tsx` — 6-digit OTP input with countdown and resend
- ⬜ `features/auth/components/change-password-form.tsx` — current + new + confirm password fields
- ⬜ `features/users/components/user-table.tsx` — list of all users with role badges and lock status
- ⬜ `features/users/components/create-user-form.tsx` — name, email, role, temp password fields
- ⬜ `features/users/components/user-role-badge.tsx` — colored badge for ADMIN / COORDINATOR / VENDOR / CLIENT

---

## Lib / Infrastructure
- ⬜ `lib/jwt.ts` — `signAccessToken(payload)`, `signRefreshToken(payload)`, `verifyToken(token, secret)`
- ⬜ `lib/email.ts` — `sendOtpEmail(to, otp)` via Resend
- ⬜ `middleware.ts` — verify JWT from cookie on all `/(authenticated)/*` routes; attach userId + role to headers

---
---

# Module 2 — Event Booking and Scheduling + Service Package Management

## Scaffold
- ⬜ `npm run create-feature -- --name bookings`
- ⬜ `npm run create-feature -- --name packages`

---

## Bookings Feature
- ⬜ `features/bookings/schemas/bookings.schema.ts` — `createBookingSchema`, `updateBookingStatusSchema`
- ⬜ `features/bookings/types/bookings.types.ts` — `BookingWithRelations`, `BookingWithPayments`, `BookingWithAll`
- ⬜ `features/bookings/services/bookings.service.ts` — `getBookings()`, `getBooking(id)`, `createBooking()`, `updateBookingStatus()`, `checkAvailability(date)`
- ⬜ `features/bookings/hooks/use-bookings.ts` — `useBookings()`, `useBooking(id)`, `useCreateBooking()`, `useUpdateBookingStatus()`, `useAvailability(date)`
- ⬜ `features/bookings/index.ts` — barrel file

## Packages Feature
- ⬜ `features/packages/schemas/packages.schema.ts` — `createPackageSchema`, `updatePackageSchema`
- ⬜ `features/packages/types/packages.types.ts` — `PackageWithBookingCount`
- ⬜ `features/packages/services/packages.service.ts` — `getPackages()`, `getPackage(id)`, `createPackage()`, `updatePackage()`
- ⬜ `features/packages/hooks/use-packages.ts` — `usePackages()`, `usePackage(id)`, `useCreatePackage()`, `useUpdatePackage()`
- ⬜ `features/packages/index.ts` — barrel file

---

## API Routes

### Bookings
- ⬜ `POST   /api/bookings` — create booking (Client); enforce one-event-per-day; write AuditLog `BOOKING_CREATED`
- ⬜ `GET    /api/bookings` — list all bookings with status filter (Admin, Coordinator)
- ⬜ `GET    /api/bookings/[bookingId]` — get booking with payments, assignments, documents (Admin, Coordinator, Client own)
- ⬜ `PATCH  /api/bookings/[bookingId]` — confirm or cancel booking; trigger document generation on confirm; write AuditLog `BOOKING_CONFIRMED` / `BOOKING_CANCELLED`
- ⬜ `GET    /api/bookings/availability?date=` — return true/false for date availability (Client)

### Packages
- ⬜ `POST   /api/packages` — create package (Admin)
- ⬜ `GET    /api/packages` — list active packages (All — for booking form)
- ⬜ `GET    /api/packages/[packageId]` — get package details (Admin)
- ⬜ `PATCH  /api/packages/[packageId]` — update package (Admin)

---

## Pages
- ⬜ `app/(authenticated)/bookings/page.tsx` — list all bookings with filters (Admin, Coordinator); client sees only own bookings
- ⬜ `app/(authenticated)/bookings/new/page.tsx` — booking request form for clients
- ⬜ `app/(authenticated)/bookings/[bookingId]/page.tsx` — booking detail: status, package, payments, vendors, staff, documents
- ⬜ `app/(authenticated)/calendar/page.tsx` — month/week calendar view of all events by status
- ⬜ `app/(authenticated)/packages/page.tsx` — service package catalog management (Admin only)
- ⬜ `app/(authenticated)/packages/new/page.tsx` — create new package form (Admin only)
- ⬜ `app/(authenticated)/packages/[packageId]/page.tsx` — package detail and edit (Admin only)

---

## Components
- ⬜ `features/bookings/components/booking-card.tsx` — compact booking summary with status badge and event date
- ⬜ `features/bookings/components/booking-form.tsx` — client booking request form with date picker and availability check
- ⬜ `features/bookings/components/booking-status-badge.tsx` — PENDING / CONFIRMED / CANCELLED with color coding
- ⬜ `features/bookings/components/booking-detail-header.tsx` — event info, status, package summary, action buttons
- ⬜ `features/bookings/components/confirm-booking-dialog.tsx` — organizer confirm action with warning
- ⬜ `features/bookings/components/cancel-booking-dialog.tsx` — confirm before cancellation with reason input
- ⬜ `features/bookings/components/event-calendar.tsx` — calendar grid rendering confirmed, pending, cancelled events
- ⬜ `features/packages/components/package-card.tsx` — tier, event type, location, price, inclusions summary
- ⬜ `features/packages/components/package-form.tsx` — create/edit form with inclusions list builder
- ⬜ `features/packages/components/package-selector.tsx` — package picker used in the booking form

---
---

# Module 3 — Payment Processing and Transaction Management

## Scaffold
- ⬜ `npm run create-feature -- --name payments`
- ⬜ `npm run create-feature -- --name installments`

---

## Payments Feature
- ⬜ `features/payments/schemas/payments.schema.ts` — `submitPaymentSchema`, `verifyPaymentSchema`
- ⬜ `features/payments/types/payments.types.ts` — `PaymentWithBooking`, `PaymentWithVerifier`
- ⬜ `features/payments/services/payments.service.ts` — `getPayments()`, `getPayment(id)`, `submitPayment()`, `verifyPayment()`
- ⬜ `features/payments/hooks/use-payments.ts` — `usePayments()`, `usePayment(id)`, `useSubmitPayment()`, `useVerifyPayment()`
- ⬜ `features/payments/index.ts` — barrel file

## Installments Feature
- ⬜ `features/installments/schemas/installments.schema.ts` — `markInstallmentPaidSchema`
- ⬜ `features/installments/types/installments.types.ts` — `InstallmentRow`
- ⬜ `features/installments/services/installments.service.ts` — `getInstallments(paymentId)`, `markInstallmentPaid()`
- ⬜ `features/installments/hooks/use-installments.ts` — `useInstallments(paymentId)`, `useMarkInstallmentPaid()`
- ⬜ `features/installments/index.ts` — barrel file

---

## API Routes

### Payments
- ⬜ `POST   /api/payments` — submit payment proof (Client); upload file to Supabase Storage; write AuditLog `PAYMENT_SUBMITTED`
- ⬜ `GET    /api/payments` — list all payments with status filter (Admin, Coordinator)
- ⬜ `GET    /api/payments/[paymentId]` — get payment with proof URL and verifier info (Admin, Coordinator, Client own)
- ⬜ `PATCH  /api/payments/[paymentId]/verify` — verify or flag payment; generate invoice + receipt on verify; write AuditLog `PAYMENT_VERIFIED` / `PAYMENT_FLAGGED`

### Installments
- ⬜ `GET    /api/payments/[paymentId]/installments` — get installment schedule (Admin, Coordinator, Client own)
- ⬜ `PATCH  /api/payments/[paymentId]/installments/[installmentId]` — mark installment as paid (Admin, Coordinator)

---

## Pages
- ⬜ `app/(authenticated)/payments/page.tsx` — payment verification queue with status filters (Admin, Coordinator)
- ⬜ `app/(authenticated)/payments/[paymentId]/page.tsx` — payment detail with proof preview and verify/flag actions

---

## Components
- ⬜ `features/payments/components/payment-proof-upload.tsx` — screenshot upload or reference number input with method selector
- ⬜ `features/payments/components/payment-status-badge.tsx` — PENDING / SUBMITTED / VERIFIED / FLAGGED
- ⬜ `features/payments/components/payment-verification-form.tsx` — staff verify/flag interface with note input
- ⬜ `features/payments/components/payment-proof-preview.tsx` — display uploaded screenshot or reference number
- ⬜ `features/payments/components/payment-summary-card.tsx` — amount, method, status, verifier, timestamp
- ⬜ `features/installments/components/installment-schedule-table.tsx` — due dates, amounts, paid status, actions
- ⬜ `features/installments/components/mark-paid-dialog.tsx` — confirm before marking installment paid

---

## Lib / Infrastructure
- ⬜ `lib/storage.ts` — `uploadPaymentProof(file, bookingId)` → URL; `getSignedUrl(path)` for proof preview

---
---

# Module 4 — Vendor Directory and Coordination

## Scaffold
- ⬜ `npm run create-feature -- --name vendors`
- ⬜ `npm run create-feature -- --name vendor-assignments`

---

## Vendors Feature
- ⬜ `features/vendors/schemas/vendors.schema.ts` — `createVendorSchema`, `updateVendorSchema`, `blockDateSchema`
- ⬜ `features/vendors/types/vendors.types.ts` — `VendorWithAssignments`, `VendorAvailabilityMap`
- ⬜ `features/vendors/services/vendors.service.ts` — `getVendors()`, `getVendor(id)`, `createVendor()`, `updateVendor()`, `getVendorAvailability(vendorId)`, `blockVendorDate()`
- ⬜ `features/vendors/hooks/use-vendors.ts` — `useVendors()`, `useVendor(id)`, `useCreateVendor()`, `useUpdateVendor()`, `useVendorAvailability(vendorId)`, `useBlockVendorDate()`
- ⬜ `features/vendors/index.ts` — barrel file

## Vendor Assignments Feature
- ⬜ `features/vendor-assignments/schemas/vendor-assignments.schema.ts` — `createAssignmentSchema`, `respondToAssignmentSchema`
- ⬜ `features/vendor-assignments/types/vendor-assignments.types.ts` — `AssignmentWithVendor`, `AssignmentWithBooking`
- ⬜ `features/vendor-assignments/services/vendor-assignments.service.ts` — `getAssignments(bookingId)`, `createAssignment()`, `respondToAssignment()`
- ⬜ `features/vendor-assignments/hooks/use-vendor-assignments.ts` — `useVendorAssignments(bookingId)`, `useCreateAssignment()`, `useRespondToAssignment()`
- ⬜ `features/vendor-assignments/index.ts` — barrel file

---

## API Routes

### Vendors
- ⬜ `POST   /api/vendors` — register new vendor (Admin)
- ⬜ `GET    /api/vendors` — list vendor directory with service type filter (Admin, Coordinator)
- ⬜ `GET    /api/vendors/[vendorId]` — get vendor profile with assignment history (Admin, Coordinator)
- ⬜ `PATCH  /api/vendors/[vendorId]` — update vendor profile (Admin)
- ⬜ `GET    /api/vendors/[vendorId]/availability` — get blocked dates calendar (Admin, Coordinator)
- ⬜ `POST   /api/vendors/[vendorId]/availability` — block or unblock a date (Admin)

### Vendor Assignments
- ⬜ `POST   /api/bookings/[bookingId]/vendor-assignments` — assign vendor; check availability; send notification; write AuditLog `VENDOR_ASSIGNED`
- ⬜ `GET    /api/bookings/[bookingId]/vendor-assignments` — list all vendor assignments for booking (Admin, Coordinator)
- ⬜ `PATCH  /api/bookings/[bookingId]/vendor-assignments/[assignmentId]` — vendor confirms/declines and submits quotation; write AuditLog `VENDOR_CONFIRMED` / `VENDOR_DECLINED`

---

## Pages
- ⬜ `app/(authenticated)/vendors/page.tsx` — private vendor directory with service type filter (Admin, Coordinator)
- ⬜ `app/(authenticated)/vendors/new/page.tsx` — register new vendor form (Admin only)
- ⬜ `app/(authenticated)/vendors/[vendorId]/page.tsx` — vendor profile, availability calendar, assignment history
- ⬜ `app/(authenticated)/vendor-portal/page.tsx` — vendor's own assignment list (Vendor only)
- ⬜ `app/(authenticated)/vendor-portal/assignments/[assignmentId]/page.tsx` — assignment detail with confirm/decline/quotation form (Vendor only)

---

## Components
- ⬜ `features/vendors/components/vendor-card.tsx` — service type, business name, coverage areas, active status
- ⬜ `features/vendors/components/vendor-form.tsx` — create/edit form with service type selector and coverage area tags
- ⬜ `features/vendors/components/vendor-availability-calendar.tsx` — month view with blocked dates highlighted
- ⬜ `features/vendor-assignments/components/assignment-list.tsx` — list of vendor assignments for a booking with status badges
- ⬜ `features/vendor-assignments/components/assign-vendor-form.tsx` — vendor selector with availability check for event date
- ⬜ `features/vendor-assignments/components/respond-assignment-form.tsx` — vendor confirm/decline with quotation amount and note fields
- ⬜ `features/vendor-assignments/components/assignment-status-badge.tsx` — PENDING / CONFIRMED / DECLINED

---

## Lib / Infrastructure
- ⬜ `lib/email.ts` — `sendVendorAssignmentNotification(vendor, booking, assignmentId)` — vendor assignment email

---
---

# Module 5 — Staff Scheduling

## Scaffold
- ⬜ `npm run create-feature -- --name staff`
- ⬜ `npm run create-feature -- --name staff-assignments`

---

## Staff Feature
- ⬜ `features/staff/schemas/staff.schema.ts` — `updateCoordinatorSchema`
- ⬜ `features/staff/types/staff.types.ts` — `CoordinatorWithAssignments`, `StaffingRecommendation`
- ⬜ `features/staff/services/staff.service.ts` — `getCoordinators()`, `getCoordinator(id)`, `getStaffingRecommendation(guestCount)`
- ⬜ `features/staff/hooks/use-staff.ts` — `useCoordinators()`, `useCoordinator(id)`, `useStaffingRecommendation(guestCount)`
- ⬜ `features/staff/index.ts` — barrel file

## Staff Assignments Feature
- ⬜ `features/staff-assignments/schemas/staff-assignments.schema.ts` — `createStaffAssignmentSchema`, `updateStaffAssignmentSchema`
- ⬜ `features/staff-assignments/types/staff-assignments.types.ts` — `StaffAssignmentWithCoordinator`
- ⬜ `features/staff-assignments/services/staff-assignments.service.ts` — `getStaffAssignments(bookingId)`, `createStaffAssignment()`, `updateStaffAssignment()`, `deleteStaffAssignment()`
- ⬜ `features/staff-assignments/hooks/use-staff-assignments.ts` — `useStaffAssignments(bookingId)`, `useCreateStaffAssignment()`, `useUpdateStaffAssignment()`, `useDeleteStaffAssignment()`
- ⬜ `features/staff-assignments/index.ts` — barrel file

---

## API Routes

### Staff
- ⬜ `GET    /api/staff` — list coordinator roster with availability and assignment load (Admin, Coordinator)

### Staff Assignments
- ⬜ `POST   /api/bookings/[bookingId]/staff-assignments` — assign coordinator; check for date conflicts; write AuditLog `STAFF_ASSIGNED`
- ⬜ `GET    /api/bookings/[bookingId]/staff-assignments` — list coordinator assignments for booking (Admin, Coordinator)
- ⬜ `PATCH  /api/bookings/[bookingId]/staff-assignments/[assignmentId]` — update task role or toggle backup designation (Admin)
- ⬜ `DELETE /api/bookings/[bookingId]/staff-assignments/[assignmentId]` — remove coordinator from booking (Admin)

---

## Pages
- ⬜ `app/(authenticated)/staff/page.tsx` — coordinator roster with assignment load per coordinator (Admin, Coordinator)
- ⬜ `app/(authenticated)/bookings/[bookingId]/staff/page.tsx` — staff assignment management for a specific booking

---

## Components
- ⬜ `features/staff/components/coordinator-roster-table.tsx` — coordinator list with upcoming event count and availability status
- ⬜ `features/staff/components/staffing-recommendation-banner.tsx` — shows recommended coordinator count based on guest count with ratios displayed
- ⬜ `features/staff-assignments/components/staff-assignment-list.tsx` — list of assigned coordinators with role, backup badge, and remove action
- ⬜ `features/staff-assignments/components/assign-coordinator-form.tsx` — coordinator selector with conflict warning display
- ⬜ `features/staff-assignments/components/remove-assignment-dialog.tsx` — confirm before removing coordinator from event

---
---

# Module 6 — Document Generation and Management

## Scaffold
- ⬜ `npm run create-feature -- --name documents`

---

## Documents Feature
- ⬜ `features/documents/schemas/documents.schema.ts` — `generateDocumentsSchema`, `updateTemplateSchema`
- ⬜ `features/documents/types/documents.types.ts` — `DocumentWithBooking`, `TemplateContext`
- ⬜ `features/documents/services/documents.service.ts` — `getDocuments(bookingId)`, `generateDocuments()`, `downloadDocument(id)`, `getTemplates()`, `updateTemplate()`
- ⬜ `features/documents/hooks/use-documents.ts` — `useDocuments(bookingId)`, `useGenerateDocuments()`, `useTemplates()`, `useUpdateTemplate()`
- ⬜ `features/documents/index.ts` — barrel file

---

## API Routes
- ⬜ `POST   /api/bookings/[bookingId]/documents/generate` — trigger document generation for specified types; write AuditLog `DOCUMENT_GENERATED`
- ⬜ `GET    /api/bookings/[bookingId]/documents` — list generated documents for a booking (Admin, Coordinator, Client own)
- ⬜ `GET    /api/documents/[documentId]/download` — stream document PDF to client (Admin, Coordinator, Client own)
- ⬜ `GET    /api/document-templates` — list all document templates (Admin)
- ⬜ `PATCH  /api/document-templates/[type]` — update template content (Admin)

---

## Pages
- ⬜ `app/(authenticated)/documents/page.tsx` — all generated documents across all bookings with type filter (Admin, Coordinator)
- ⬜ `app/(authenticated)/bookings/[bookingId]/documents/page.tsx` — documents for a specific booking with download links
- ⬜ `app/(authenticated)/documents/templates/page.tsx` — document template management (Admin only)
- ⬜ `app/(authenticated)/documents/templates/[type]/page.tsx` — template editor for a specific document type (Admin only)

---

## Components
- ⬜ `features/documents/components/document-list.tsx` — table of generated documents with type, generation date, and download button
- ⬜ `features/documents/components/document-type-badge.tsx` — readable label for each DocumentType enum value
- ⬜ `features/documents/components/generate-documents-button.tsx` — trigger manual document generation with type selector
- ⬜ `features/documents/components/template-editor.tsx` — HTML/Markdown template editor with variable reference panel

---

## Lib / Infrastructure
- ⬜ `lib/pdf.ts` — `generatePdf(templateContent, data)` → Buffer; `mergeBookingData(template, booking)` → populated string
- ⬜ `lib/storage.ts` — `uploadDocument(buffer, bookingId, type)` → filePath; `getDocumentSignedUrl(filePath)` → URL
- ⬜ `lib/email.ts` — `sendDocumentNotification(client, bookingId, documentType)` — document ready email

---
---

# Module 7 — Secured Event Planning and Audit Trail

## Scaffold
- ⬜ `npm run create-feature -- --name audit`

---

## Audit Feature
- ⬜ `features/audit/schemas/audit.schema.ts` — `auditFilterSchema`, `auditExportSchema`
- ⬜ `features/audit/types/audit.types.ts` — `AuditLogWithUser`, `AuditFilters`, `AuditExportOptions`
- ⬜ `features/audit/services/audit.service.ts` — `getAuditLogs(filters)`, `exportAuditLogs(filters, format)`
- ⬜ `features/audit/hooks/use-audit.ts` — `useAuditLogs(filters)`, `useExportAuditLogs()`
- ⬜ `features/audit/index.ts` — barrel file

---

## API Routes
- ⬜ `GET    /api/audit` — list audit logs with filters: date range, userId, module, action (Admin only); write AuditLog `REPORT_ACCESSED`
- ⬜ `GET    /api/audit/export` — export filtered audit logs as CSV or PDF (Admin only); write AuditLog `AUDIT_EXPORTED`

---

## Pages
- ⬜ `app/(authenticated)/audit/page.tsx` — audit trail viewer with search, filter controls, and export button (Admin only)

---

## Components
- ⬜ `features/audit/components/audit-log-table.tsx` — paginated table: timestamp, user, action, module, description, status
- ⬜ `features/audit/components/audit-filters.tsx` — date range picker, user selector, module dropdown, action type filter
- ⬜ `features/audit/components/audit-action-badge.tsx` — color-coded badge for each AuditAction enum value
- ⬜ `features/audit/components/export-audit-dialog.tsx` — format selector (CSV / PDF) with date range confirmation

---
---

# Module 8 — Real-Time Reporting and Decision Support

## Scaffold
- ⬜ `npm run create-feature -- --name reports`

---

## Reports Feature
- ⬜ `features/reports/schemas/reports.schema.ts` — `reportFilterSchema`, `reportExportSchema`
- ⬜ `features/reports/types/reports.types.ts` — `BookingReport`, `PaymentReport`, `VendorReport`, `StaffReport`, `AuditReport`, `DashboardMetrics`
- ⬜ `features/reports/services/reports.service.ts` — `getDashboardMetrics()`, `getBookingReport()`, `getPaymentReport()`, `getVendorReport()`, `getStaffReport()`, `getAuditReport()`, `exportReport(type, filters, format)`
- ⬜ `features/reports/hooks/use-reports.ts` — `useDashboardMetrics()`, `useBookingReport()`, `usePaymentReport()`, `useVendorReport()`, `useStaffReport()`, `useAuditReport()`, `useExportReport()`
- ⬜ `features/reports/index.ts` — barrel file

---

## API Routes
- ⬜ `GET    /api/reports/dashboard` — real-time dashboard metrics: active bookings, pending verifications, upcoming events, recent audit activity (Admin)
- ⬜ `GET    /api/reports/bookings` — booking and scheduling report with status breakdown (Admin, Coordinator); write AuditLog `REPORT_ACCESSED`
- ⬜ `GET    /api/reports/payments` — payment and transaction report with verification summary and outstanding balances (Admin, Coordinator)
- ⬜ `GET    /api/reports/vendors` — vendor coordination report with assignment and confirmation status (Admin, Coordinator)
- ⬜ `GET    /api/reports/staff` — staff scheduling report with coordinator load and backup coverage (Admin, Coordinator)
- ⬜ `GET    /api/reports/audit` — audit trail summary report (Admin)
- ⬜ `GET    /api/reports/[type]/export` — export any report as CSV or PDF (Admin, Coordinator)

---

## Pages
- ⬜ `app/(authenticated)/dashboard/page.tsx` — real-time operational dashboard with key metrics and alert cards (Admin)
- ⬜ `app/(authenticated)/reports/page.tsx` — report type selector landing page (Admin, Coordinator)
- ⬜ `app/(authenticated)/reports/bookings/page.tsx` — booking and scheduling report with filters
- ⬜ `app/(authenticated)/reports/payments/page.tsx` — payment and transaction report with outstanding balance view
- ⬜ `app/(authenticated)/reports/vendors/page.tsx` — vendor coordination report
- ⬜ `app/(authenticated)/reports/staff/page.tsx` — staff scheduling report
- ⬜ `app/(authenticated)/reports/audit/page.tsx` — audit trail monitoring report

---

## Components
- ⬜ `features/reports/components/dashboard-metrics-grid.tsx` — grid of stat cards: active bookings, pending payments, upcoming events, recent audit entries
- ⬜ `features/reports/components/pending-verifications-alert.tsx` — count of unverified payments with link to payments queue
- ⬜ `features/reports/components/upcoming-events-list.tsx` — next 7 days of confirmed events with quick-access links
- ⬜ `features/reports/components/recent-audit-feed.tsx` — last N audit log entries rendered as an activity feed
- ⬜ `features/reports/components/booking-report-table.tsx` — bookings summary with status distribution and event type breakdown
- ⬜ `features/reports/components/payment-report-table.tsx` — payment transactions with verification status, outstanding balances, and installment summary
- ⬜ `features/reports/components/vendor-report-table.tsx` — vendor assignment statuses and quotation totals per event
- ⬜ `features/reports/components/staff-report-table.tsx` — coordinator assignments per event with staffing ratio compliance indicator
- ⬜ `features/reports/components/export-report-button.tsx` — export current report as CSV or PDF with format selector
