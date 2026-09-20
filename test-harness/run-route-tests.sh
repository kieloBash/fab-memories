#!/usr/bin/env bash
# test-harness/run-route-tests.sh
#
# Runs the Module 8 route-handler tests against your LOCAL database.
#   1. backs up lib/clerk/auth.ts
#   2. swaps in test-harness/auth.stub.ts
#   3. runs test-harness/verify-report-routes.ts
#   4. restores the real auth.ts — even if the tests crash or you press Ctrl-C
#
# Prerequisites: DATABASE_URL points at a DEV database that has been seeded with
#   npx tsx prisma/seed.ts && npx tsx prisma/seed-reports.ts
# NEVER point this at production: the tests create and delete a few temporary rows
# and write audit entries.
set -euo pipefail
cd "$(dirname "$0")/.."

AUTH="lib/clerk/auth.ts"
[ -f "$AUTH" ] || { echo "Cannot find $AUTH — run from the project root."; exit 1; }
[ -f "$AUTH.bak" ] && { echo "$AUTH.bak already exists — a previous run was interrupted. Restore it first (mv $AUTH.bak $AUTH)."; exit 1; }

cp "$AUTH" "$AUTH.bak"
trap 'mv "$AUTH.bak" "$AUTH"; echo "→ restored $AUTH"' EXIT
cp test-harness/auth.stub.ts "$AUTH"

npx tsx test-harness/verify-report-routes.ts
