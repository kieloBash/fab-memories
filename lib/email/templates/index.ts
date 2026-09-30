// lib/email/templates/index.ts
export { bookingStatusEmail } from "./booking-status"
export type { BookingStatusEmailData, BookingStatusKind } from "./booking-status"
export { paymentFlaggedEmail, paymentVerifiedEmail } from "./payment"
export type { PaymentEmailData } from "./payment"
export { notificationEmail, testEmail } from "./notification"
export { esc } from "./layout"
