#!/usr/bin/env bash
# test-harness/run-route-tests.sh
#
# Runs the route-handler tests against your LOCAL database.
#   1. backs up lib/clerk/auth.ts and lib/clerk/client.ts
#   2. swaps in test-harness/auth.stub.ts and test-harness/clerk-client.stub.ts
#   3. runs every verify-*-routes.ts test file
#   4. restores the real files — even if the tests crash or you press Ctrl-C
#
# Prerequisites: DATABASE_URL points at a DEV database that has been seeded with
#   npx tsx prisma/seed.ts && npx tsx prisma/seed-reports.ts
# (Optional) OWNER_DATABASE_URL = owner-role URL, only needed when DATABASE_URL/RUNTIME_DATABASE_URL is the
# restricted app_runtime role — used to clean up rows the restricted role may not delete.
# NEVER point this at production: the tests create and delete a few temporary rows
# and write audit entries.
set -euo pipefail
cd "$(dirname "$0")/.."

AUTH="lib/clerk/auth.ts"
CLIENT="lib/clerk/client.ts"
[ -f "$AUTH" ] || { echo "Cannot find $AUTH — run from the project root."; exit 1; }
[ -f "$AUTH.bak" ] && { echo "$AUTH.bak already exists — a previous run was interrupted. Restore it first (mv $AUTH.bak $AUTH)."; exit 1; }
[ -f "$CLIENT.bak" ] && { echo "$CLIENT.bak already exists — a previous run was interrupted. Restore it first (mv $CLIENT.bak $CLIENT)."; exit 1; }

cp "$AUTH" "$AUTH.bak"
cp "$CLIENT" "$CLIENT.bak"
trap 'mv "$AUTH.bak" "$AUTH"; mv "$CLIENT.bak" "$CLIENT"; echo "→ restored $AUTH and $CLIENT"' EXIT
cp test-harness/auth.stub.ts "$AUTH"
cp test-harness/clerk-client.stub.ts "$CLIENT"

npx tsx test-harness/verify-report-routes.ts
npx tsx test-harness/verify-integrity-routes.ts
npx tsx test-harness/verify-portal-routes.ts
npx tsx test-harness/verify-vendor-routes.ts
npx tsx test-harness/verify-booking-history-routes.ts
npx tsx test-harness/verify-package-routes.ts
npx tsx test-harness/verify-staff-account-routes.ts
npx tsx test-harness/verify-booking-search-routes.ts
npx tsx test-harness/verify-availability-routes.ts
