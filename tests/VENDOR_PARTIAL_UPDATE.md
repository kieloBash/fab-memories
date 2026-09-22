# Vendor updates are now true partial updates

## The bug

Both vendor PATCH endpoints wrote **every** field on every request, using `input.field ?? null`. A field the caller
did not send arrived as `undefined`, and `undefined ?? null` is `null` — so a field left out was silently erased.

- `PATCH /api/vendors/[id]` — editing just the name wiped the vendor's phone, e-mail, contact channel, coverage
  areas and notes.
- `PATCH /api/bookings/[bookingId]/vendors/[vendorId]` — Module 8's "Record quotation" dialog worked around this by
  always resending the whole record; any OTHER caller of the same endpoint (a future vendor portal, an API script)
  would have silently un-marked the vendor as contacted/confirmed and erased its notes the moment it sent only the
  quotation.

## The fix

A field not sent is left unchanged. `null` (or `""` for a text field) explicitly clears it. Sending an array,
including `[]`, replaces the coverage list; omitting it leaves the list as it was.

| You send | Result |
|---|---|
| the field is **not present** in the body | unchanged |
| `null` (or `""` for text) | cleared |
| a value | set to that value |
| `coverageAreas: []` | coverage list cleared |
| `coverageAreas` not sent | coverage list unchanged |

`name` and `category` are required and cannot be cleared — sending `""` for `name` is rejected (422), not silently
accepted as empty.

## Files

- `features/vendors/vendors.schema.ts` — fields are `.nullable().optional()` so `null` is a valid, meaningful value
- `features/vendors/vendors.query.ts` — `updateVendorRecord()` and `updateBookingVendorRecord()` now build the
  Prisma `data` object one field at a time, only for fields present in the input
- `prisma/verify-vendors-partial.ts` — 15 data-layer checks
- `test-harness/verify-vendor-routes.ts` — 12 route-level checks (added to `run-route-tests.sh`)

## Verified

- 15 data-layer checks, 12 route-level checks (all through the real HTTP handlers), full regression (56+56+21+12
  route checks, 111+83+29+15 data checks, 132 UI tests) — all passing.
- Reverted each fix on purpose: both mutations were caught immediately by the data-layer tests.
- No UI change was needed — Module 8's quotation dialog already resends the full record, which remains harmless
  under the new semantics.

## Nothing to do after installing

No schema/migration change, no new environment variable. Copy the files in and run:
```bash
npx tsx prisma/verify-vendors-partial.ts   # 15 passed
bash test-harness/run-route-tests.sh       # includes the 12 new checks
```
