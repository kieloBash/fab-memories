// features/reports/reports.dates.ts
//
// Date helpers for Module 8. Isomorphic (no server imports).
//
// WHY THIS FILE EXISTS
// Booking.eventDate is a Postgres DATE, which Prisma reads/writes as a
// UTC-midnight Date. "Today" for the business is a *Manila* calendar date,
// not a UTC one — between 00:00 and 08:00 Manila time the UTC date is still
// "yesterday", which would mis-classify due dates and today's events.
// Manila is UTC+8 with no daylight saving, so a fixed offset is exact.

import { REPORT_TIMEZONE } from "./reports.constants"

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Manila calendar date of `now` as "YYYY-MM-DD". */
export function manilaYmd(now: Date = new Date()): string {
  return ymdFormatter.format(now)
}

/**
 * Manila "today" as a UTC-midnight Date — directly comparable with
 * `@db.Date` columns (eventDate, Installment.dueDate) and with the
 * date-only values stored in depositDueDate / fullPaymentDueDate.
 */
export function manilaToday(now: Date = new Date()): Date {
  return new Date(`${manilaYmd(now)}T00:00:00.000Z`)
}

/** Parses "YYYY-MM-DD" into a UTC-midnight Date (for `@db.Date` comparisons). */
export function dateOnly(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`)
}

/** Formats a `@db.Date` value (UTC-midnight Date) as "YYYY-MM-DD". */
export function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY)
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function dayDiff(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY)
}

/** Start of the given Manila calendar day, as a UTC instant (for timestamp columns). */
export function manilaDayStartUtc(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000+08:00`)
}

/** End of the given Manila calendar day, as a UTC instant (for timestamp columns). */
export function manilaDayEndUtc(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.999+08:00`)
}

/** "2026-09" month bucket for a `@db.Date` value. */
export function toMonthKey(d: Date): string {
  return d.toISOString().slice(0, 7)
}

export function hoursSince(then: Date, now: Date = new Date()): number {
  return (now.getTime() - then.getTime()) / (60 * 60 * 1000)
}
