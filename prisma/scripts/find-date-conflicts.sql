-- prisma/scripts/find-date-conflicts.sql
-- Lists dates that already hold more than one CONFIRMED / CANCELLATION_REQUESTED booking, with the
-- bookings involved. Run this BEFORE the one-booking-per-date migration if it aborts.
--
--   psql "$DATABASE_URL" -f prisma/scripts/find-date-conflicts.sql
--
-- Fix each date by cancelling or declining all but one booking, then re-run the migration.
SELECT to_char(b."eventDate", 'YYYY-MM-DD') AS event_date,
       b."id"            AS booking_id,
       b."status",
       u."fullName"      AS client,
       b."eventType",
       b."depositVerifiedAt" IS NOT NULL AS deposit_verified
FROM "Booking" b
JOIN "User" u ON u."id" = b."clientId"
WHERE b."status" IN ('CONFIRMED', 'CANCELLATION_REQUESTED')
  AND b."eventDate" IN (
        SELECT "eventDate" FROM "Booking"
        WHERE "status" IN ('CONFIRMED', 'CANCELLATION_REQUESTED')
        GROUP BY "eventDate" HAVING count(*) > 1)
ORDER BY b."eventDate", b."createdAt";
