// features/integrity/integrity.types.ts

export type CheckStatus = "pass" | "warn" | "fail"

export interface IntegrityCheck {
  id:      "audit-chain" | "audit-immutable" | "one-per-date-index" | "rule-violations" | "audit-write-failures"
  title:   string
  status:  CheckStatus
  /** One plain-language sentence: what the check found. */
  summary: string
  /** Supporting facts / offending records. */
  detail:  string[]
  /** What to do about it (only when status is not "pass"). */
  remedy?: string
}

export interface IntegrityReport {
  generatedAt: string
  overall:     CheckStatus
  /** The database role the application is connected as. */
  database:    { role: string; usingRuntimeUrl: boolean }
  checks:      IntegrityCheck[]
}
