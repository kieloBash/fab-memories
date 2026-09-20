// lib/domain-errors.ts
//
// Errors that carry an HTTP status and a stable machine-readable code, so a
// rule violation deep inside a transaction becomes a clean 4xx response
// instead of a generic 500.

export type DomainErrorCode =
  | "BOOKING_NOT_FOUND"
  | "INVALID_STATE"
  | "DATE_TAKEN"
  | "DEPOSIT_NOT_VERIFIED"
  | "PAYMENT_ALREADY_REVIEWED"
  | "AUDIT_WRITE_FAILED"

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "DomainError"
  }
}

/** Thrown when an audit entry could not be written inside an atomic action (the action is rolled back). */
export class AuditWriteError extends DomainError {
  constructor(public readonly cause?: unknown) {
    super(
      "AUDIT_WRITE_FAILED",
      "The action was not completed because it could not be recorded in the audit trail. Nothing was changed — please try again.",
      503,
    )
    this.name = "AuditWriteError"
  }
}
